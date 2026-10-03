import {
  createSign,
} from "node:crypto";

const TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const DATA_API =
  "https://analyticsdata.googleapis.com/v1beta";

const ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

const globalForGoogleAnalytics =
  globalThis as typeof globalThis & {
    __staarkGoogleAnalyticsToken?: TokenCache;
  };

export class GoogleAnalyticsDataError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name =
      "GoogleAnalyticsDataError";
    this.status = status;
  }
}

export type GoogleAnalyticsServiceConfig = {
  clientEmail: string;
  privateKey: string;
};

export function resolveGoogleAnalyticsServiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): GoogleAnalyticsServiceConfig | null {
  const clientEmail =
    env.GOOGLE_ANALYTICS_CLIENT_EMAIL
      ?.trim();

  const rawPrivateKey =
    env.GOOGLE_ANALYTICS_PRIVATE_KEY
      ?.trim();

  if (
    !clientEmail ||
    !rawPrivateKey
  ) {
    return null;
  }

  return {
    clientEmail,

    // Docker/env files commonly preserve newlines as "\\n".
    privateKey:
      rawPrivateKey.replace(
        /\\n/g,
        "\n",
      ),
  };
}

export function googleAnalyticsServiceSummary(
  env: NodeJS.ProcessEnv = process.env,
) {
  const config =
    resolveGoogleAnalyticsServiceConfig(
      env,
    );

  return {
    configured:
      Boolean(config),

    clientEmail:
      config?.clientEmail ?? null,
  };
}

function base64Url(
  input: string | Buffer,
): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createServiceAccountAssertion(
  config: GoogleAnalyticsServiceConfig,
): string {
  const now =
    Math.floor(Date.now() / 1000);

  const header =
    base64Url(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT",
      }),
    );

  const payload =
    base64Url(
      JSON.stringify({
        iss: config.clientEmail,
        scope: ANALYTICS_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    );

  const unsigned =
    `${header}.${payload}`;

  const signer =
    createSign("RSA-SHA256");

  signer.update(unsigned);
  signer.end();

  const signature =
    signer.sign(
      config.privateKey,
    );

  return `${unsigned}.${base64Url(
    signature,
  )}`;
}

async function accessToken(): Promise<string> {
  const cached =
    globalForGoogleAnalytics
      .__staarkGoogleAnalyticsToken;

  if (
    cached &&
    cached.expiresAt >
      Date.now() + 60_000
  ) {
    return cached.accessToken;
  }

  const config =
    resolveGoogleAnalyticsServiceConfig();

  if (!config) {
    throw new GoogleAnalyticsDataError(
      "Google Analytics Data API credentials are not configured on this runtime.",
    );
  }

  const assertion =
    createServiceAccountAssertion(
      config,
    );

  const body =
    new URLSearchParams({
      grant_type:
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });

  const response =
    await fetch(TOKEN_URL, {
      method: "POST",

      headers: {
        "content-type":
          "application/x-www-form-urlencoded",
      },

      body,

      cache: "no-store",
    });

  const result =
    await response
      .json()
      .catch(() => null) as
      | {
          access_token?: string;
          expires_in?: number;
          error_description?: string;
          error?: string;
        }
      | null;

  if (
    !response.ok ||
    !result?.access_token
  ) {
    throw new GoogleAnalyticsDataError(
      result?.error_description ||
        result?.error ||
        "Could not authenticate with Google Analytics.",
      response.status,
    );
  }

  const expiresIn =
    typeof result.expires_in ===
      "number"
      ? result.expires_in
      : 3600;

  globalForGoogleAnalytics
    .__staarkGoogleAnalyticsToken = {
      accessToken:
        result.access_token,

      expiresAt:
        Date.now() +
        expiresIn * 1000,
    };

  return result.access_token;
}

export type GaRunReportRequest = {
  dateRanges: Array<{
    startDate: string;
    endDate: string;
  }>;

  dimensions?: Array<{
    name: string;
  }>;

  metrics: Array<{
    name: string;
  }>;

  limit?: string;
  orderBys?: Array<
    Record<string, unknown>
  >;
};

export type GaReportRow = {
  dimensionValues?: Array<{
    value?: string;
  }>;

  metricValues?: Array<{
    value?: string;
  }>;
};

export type GaRunReportResponse = {
  rows?: GaReportRow[];

  totals?: GaReportRow[];

  rowCount?: number;

  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
};

export async function runGoogleAnalyticsReport(
  propertyId: string,
  request: GaRunReportRequest,
): Promise<GaRunReportResponse> {
  if (!/^\d+$/.test(propertyId)) {
    throw new GoogleAnalyticsDataError(
      "Invalid Google Analytics Property ID.",
    );
  }

  const token =
    await accessToken();

  const response =
    await fetch(
      `${DATA_API}/properties/${propertyId}:runReport`,
      {
        method: "POST",

        headers: {
          authorization:
            `Bearer ${token}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(request),

        cache: "no-store",
      },
    );

  const result =
    await response
      .json()
      .catch(() => null) as
      | (GaRunReportResponse & {
          error?: {
            message?: string;
          };
        })
      | null;

  if (!response.ok) {
    throw new GoogleAnalyticsDataError(
      result?.error?.message ||
        `Google Analytics Data API returned ${response.status}.`,
      response.status,
    );
  }

  return result ?? {};
}

export async function testGoogleAnalyticsProperty(
  propertyId: string,
) {
  const report =
    await runGoogleAnalyticsReport(
      propertyId,
      {
        dateRanges: [
          {
            startDate: "7daysAgo",
            endDate: "today",
          },
        ],

        metrics: [
          {
            name: "activeUsers",
          },
        ],

        limit: "1",
      },
    );

  return {
    ok: true,
    timeZone:
      report.metadata?.timeZone ??
      null,
  };
}
