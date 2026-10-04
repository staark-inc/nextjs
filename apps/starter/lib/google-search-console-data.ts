import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS_API = "https://www.googleapis.com/webmasters/v3";
const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

const globalForSearchConsole =
  globalThis as typeof globalThis & {
    __staarkSearchConsoleToken?: TokenCache;
  };

export class SearchConsoleError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "SearchConsoleError";
    this.status = status;
  }
}

type ServiceConfig = {
  clientEmail: string;
  privateKey: string;
};

export function resolveSearchConsoleServiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServiceConfig | null {
  const clientEmail =
    env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim() ||
    env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.trim();

  const rawPrivateKey =
    env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.trim() ||
    env.GOOGLE_ANALYTICS_PRIVATE_KEY?.trim();

  if (!clientEmail || !rawPrivateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
  };
}

export function searchConsoleServiceSummary() {
  const config = resolveSearchConsoleServiceConfig();

  return {
    configured: Boolean(config),
    clientEmail: config?.clientEmail ?? null,
  };
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function assertion(config: ServiceConfig): string {
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    }),
  );

  const payload = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SEARCH_CONSOLE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsigned = `${header}.${payload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  return `${unsigned}.${base64Url(
    signer.sign(config.privateKey),
  )}`;
}

async function accessToken(): Promise<string> {
  const cached =
    globalForSearchConsole.__staarkSearchConsoleToken;

  if (
    cached &&
    cached.expiresAt > Date.now() + 60_000
  ) {
    return cached.accessToken;
  }

  const config =
    resolveSearchConsoleServiceConfig();

  if (!config) {
    throw new SearchConsoleError(
      "Google Search Console credentials are not configured.",
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion(config),
    }),
    cache: "no-store",
  });

  const result = await response
    .json()
    .catch(() => null) as
    | {
        access_token?: string;
        expires_in?: number;
        error_description?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !result?.access_token) {
    throw new SearchConsoleError(
      result?.error_description ||
        result?.error ||
        "Could not authenticate with Google Search Console.",
      response.status,
    );
  }

  const expiresIn =
    typeof result.expires_in === "number"
      ? result.expires_in
      : 3600;

  globalForSearchConsole.__staarkSearchConsoleToken = {
    accessToken: result.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return result.access_token;
}

async function googleRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = await accessToken();

  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body
        ? { "content-type": "application/json" }
        : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const result = await response
    .json()
    .catch(() => null) as
    | (T & {
        error?: {
          message?: string;
        };
      })
    | null;

  if (!response.ok) {
    throw new SearchConsoleError(
      result?.error?.message ||
        `Google Search Console API returned ${response.status}.`,
      response.status,
    );
  }

  return (result ?? {}) as T;
}

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type SearchConsoleQueryResponse = {
  rows?: SearchConsoleRow[];
  responseAggregationType?: string;
};

export async function testSearchConsoleProperty(
  siteUrl: string,
) {
  const result = await googleRequest<{
    siteUrl?: string;
    permissionLevel?: string;
  }>(
    `${WEBMASTERS_API}/sites/${encodeURIComponent(siteUrl)}`,
  );

  return {
    ok: true,
    siteUrl: result.siteUrl ?? siteUrl,
    permissionLevel:
      result.permissionLevel ?? null,
  };
}

export async function querySearchConsole(
  siteUrl: string,
  input: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    startRow?: number;
  },
): Promise<SearchConsoleQueryResponse> {
  return googleRequest<SearchConsoleQueryResponse>(
    `${WEBMASTERS_API}/sites/${encodeURIComponent(
      siteUrl,
    )}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        ...(input.dimensions
          ? { dimensions: input.dimensions }
          : {}),
        rowLimit: input.rowLimit ?? 25,
        startRow: input.startRow ?? 0,
      }),
    },
  );
}
