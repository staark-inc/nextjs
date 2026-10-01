export const STAARK_DATA_SOURCES = ["legacy", "postgres"] as const;
export type StaarkDataSource = (typeof STAARK_DATA_SOURCES)[number];

export const STAARK_DATA_FALLBACKS = ["none", "legacy"] as const;
export type StaarkDataFallback = (typeof STAARK_DATA_FALLBACKS)[number];

export type PublicContentConfig = {
  source: StaarkDataSource;
  fallback: StaarkDataFallback;
  /**
   * Optional development/local fallback site key.
   *
   * Production PostgreSQL reads resolve the tenant from the request hostname.
   * This remains intentionally separate from STAARK_SITE_ID, which belongs to
   * the Hub pairing protocol.
   */
  siteKey: string;
};

function readChoice<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }
  throw new Error(
    `${name} must be one of: ${allowed.join(", ")}. Received "${value}".`,
  );
}

function normalizeSiteKey(value: string | undefined): string {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key) return "";
  if (!/^[a-z0-9][a-z0-9-_]{0,99}$/.test(key)) {
    throw new Error(
      "STAARK_SITE_KEY must be 1-100 lowercase letters, numbers, dashes or underscores.",
    );
  }
  return key;
}

/**
 * Resolve the public read cutover independently from STAARK_CONTENT_SOURCE.
 *
 * STAARK_CONTENT_SOURCE already means Hub vs fixture transport and must remain
 * backwards compatible. STAARK_DATA_SOURCE decides whether public Site/Page
 * reads use that legacy transport or the Storage v2 PostgreSQL repositories.
 */
export function resolvePublicContentConfig(
  env: NodeJS.ProcessEnv = process.env,
): PublicContentConfig {
  const source = readChoice(
    "STAARK_DATA_SOURCE",
    env.STAARK_DATA_SOURCE,
    STAARK_DATA_SOURCES,
    "legacy",
  );
  const fallback = readChoice(
    "STAARK_DATA_FALLBACK",
    env.STAARK_DATA_FALLBACK,
    STAARK_DATA_FALLBACKS,
    "none",
  );
  const siteKey = normalizeSiteKey(env.STAARK_SITE_KEY);

  return { source, fallback, siteKey };
}
