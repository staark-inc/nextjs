import { signRequest } from "./sign";

/** Resolved connection settings, read from env by `readStaarkEnv()`. */
export type HubConnection = {
  source: "hub" | "fixtures";
  hubUrl: string;
  siteId: string;
  secret: string;
  /** Local content folder used when source is "fixtures". */
  contentDir: string;
  /** Safety-net revalidation in seconds; the Hub webhook is the primary trigger. */
  revalidate: number;
};

export const DEFAULT_HUB_URL = "https://staarkinc.com";
const DEV_SECRET = "staark-dev-secret-do-not-use-in-production";

/**
 * Environment variables:
 *   STAARK_HUB_URL          default https://staarkinc.com
 *   STAARK_SITE_ID          site id from pairing in Staark Hub
 *   STAARK_SITE_SECRET      site secret from pairing (server-only, never NEXT_PUBLIC_)
 *   STAARK_CONTENT_SOURCE   "hub" | "fixtures" (default: hub when id+secret are set)
 *   STAARK_HUB_ALLOW_HTTP   "1" to allow plain http for a local/dev Hub
 *   STAARK_REVALIDATE       fallback cache lifetime in seconds (default 3600)
 */
export function readStaarkEnv(env: NodeJS.ProcessEnv = process.env): HubConnection {
  const siteId = env.STAARK_SITE_ID?.trim() ?? "";
  const secret = env.STAARK_SITE_SECRET?.trim() ?? "";
  const explicit = env.STAARK_CONTENT_SOURCE?.trim();
  const source: HubConnection["source"] =
    explicit === "fixtures" || explicit === "hub" ? explicit : siteId && secret ? "hub" : "fixtures";

  const hubUrl = (env.STAARK_HUB_URL?.trim() || DEFAULT_HUB_URL).replace(/\/+$/, "");

  if (source === "hub") {
    if (!siteId || !secret) {
      throw new Error("STAARK_CONTENT_SOURCE=hub needs STAARK_SITE_ID and STAARK_SITE_SECRET (pair the site in Staark Hub).");
    }
    const url = new URL(hubUrl);
    const httpAllowed = url.protocol === "http:" && env.STAARK_HUB_ALLOW_HTTP === "1";
    if (url.protocol !== "https:" && !httpAllowed) {
      throw new Error(
        "Staark Hub API must use HTTPS. Plain HTTP is allowed only with STAARK_HUB_ALLOW_HTTP=1 for a local/development Hub.",
      );
    }
  } else if (env.NODE_ENV === "production" && env.STAARK_ALLOW_FIXTURES_IN_PRODUCTION !== "1") {
    console.warn("[staark] Serving local fixture content in production. Pair the site in Staark Hub and set STAARK_SITE_ID / STAARK_SITE_SECRET.");
  }

  return {
    source,
    hubUrl,
    siteId: siteId || "local-dev",
    secret: secret || env.STAARK_FORM_SECRET?.trim() || DEV_SECRET,
    contentDir: env.STAARK_CONTENT_DIR?.trim() || "content",
    revalidate: Number(env.STAARK_REVALIDATE ?? 3600) || 3600,
  };
}

export class HubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "HubError";
  }
}

export const CLIENT_VERSION = "0.1.0";

/**
 * Signed JSON request to Staark Hub. Same envelope as the WordPress connector:
 * 2xx and (no `ok` field or ok === true) is success; `error` carries the message.
 */
export async function hubRequest<T>(
  conn: HubConnection,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; tags?: string[]; cache?: boolean } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const body = init.body === undefined ? "" : JSON.stringify(init.body);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Staark-Client": "nextjs",
    "X-Staark-Hub-Version": CLIENT_VERSION,
    ...signRequest({ method, path, body, siteId: conn.siteId, secret: conn.secret }),
  };

  const cacheable = method === "GET" && init.cache !== false;
  let response: Response;
  try {
    response = await fetch(conn.hubUrl + path, {
      method,
      headers,
      body: body === "" ? undefined : body,
      signal: AbortSignal.timeout(12_000),
      ...(cacheable
        ? { cache: "force-cache" as const, next: { tags: init.tags ?? [], revalidate: conn.revalidate } }
        : { cache: "no-store" as const }),
    });
  } catch (error) {
    throw new HubError(`Could not reach Staark Hub (${(error as Error).message}).`, 0, path);
  }

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    // Non-JSON body; handled below.
  }

  const ok = response.ok && (data.ok === undefined || data.ok === true);
  if (!ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : response.status === 404
          ? "The Staark Next.js content endpoint is not deployed on the Hub yet."
          : `Staark Hub returned HTTP ${response.status}.`;
    throw new HubError(message, response.status, path);
  }
  return data as T;
}
