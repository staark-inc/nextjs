const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export type CloudflareOwnershipVerification = {
  name?: string;
  type?: "txt";
  value?: string;
};

export type CloudflareSslValidationRecord = {
  cname?: string;
  cname_target?: string;
  txt_name?: string;
  txt_value?: string;
  status?: string;
};

export type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  verification_errors?: string[];
  ownership_verification?: CloudflareOwnershipVerification;
  ssl?: {
    status?: string;
    method?: string;
    validation_records?: CloudflareSslValidationRecord[];
    validation_errors?: Array<{ message?: string }>;
  };
};

type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: unknown[];
};

export class CloudflareSaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number | null = null,
  ) {
    super(message);
    this.name = "CloudflareSaasError";
  }
}

function cloudflareConfig() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const cnameTarget =
    process.env.CLOUDFLARE_SAAS_CNAME_TARGET?.trim().toLowerCase() ||
    "customers.staark.app";

  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
  }
  if (!zoneId) {
    throw new Error("CLOUDFLARE_ZONE_ID is not configured.");
  }

  return { apiToken, zoneId, cnameTarget };
}

async function cloudflareRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiToken } = cloudflareConfig();
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | CloudflareEnvelope<T>
    | null;

  if (!response.ok || !payload?.success) {
    const first = payload?.errors?.[0];
    const message =
      first?.message ||
      `Cloudflare Custom Hostnames request failed with HTTP ${response.status}.`;
    throw new CloudflareSaasError(
      message,
      response.status,
      typeof first?.code === "number" ? first.code : null,
    );
  }

  return payload.result;
}

export function cloudflareSaasCnameTarget(): string {
  return cloudflareConfig().cnameTarget;
}

export async function findCloudflareCustomHostname(
  hostname: string,
): Promise<CloudflareCustomHostname | null> {
  const { zoneId } = cloudflareConfig();
  const query = new URLSearchParams({ hostname });
  const rows = await cloudflareRequest<CloudflareCustomHostname[]>(
    `/zones/${encodeURIComponent(zoneId)}/custom_hostnames?${query.toString()}`,
  );
  return rows.find((row) => row.hostname.toLowerCase() === hostname.toLowerCase()) ?? null;
}

export async function createCloudflareCustomHostname(
  hostname: string,
): Promise<CloudflareCustomHostname> {
  const { zoneId } = cloudflareConfig();

  return cloudflareRequest<CloudflareCustomHostname>(
    `/zones/${encodeURIComponent(zoneId)}/custom_hostnames`,
    {
      method: "POST",
      body: JSON.stringify({
        hostname,
        ssl: {
          method: "txt",
          type: "dv",
        },
      }),
    },
  );
}

export async function getCloudflareCustomHostname(
  id: string,
): Promise<CloudflareCustomHostname> {
  const { zoneId } = cloudflareConfig();
  return cloudflareRequest<CloudflareCustomHostname>(
    `/zones/${encodeURIComponent(zoneId)}/custom_hostnames/${encodeURIComponent(id)}`,
  );
}

export async function deleteCloudflareCustomHostname(id: string): Promise<void> {
  const { zoneId } = cloudflareConfig();

  try {
    await cloudflareRequest<{ id?: string }>(
      `/zones/${encodeURIComponent(zoneId)}/custom_hostnames/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  } catch (error) {
    if (error instanceof CloudflareSaasError && error.status === 404) return;
    throw error;
  }
}
