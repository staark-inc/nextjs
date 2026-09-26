import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Staark connector signature, byte-for-byte the same scheme as the WordPress
 * plugin (staark-core.php → staark_hub_connection_request):
 *
 *   payload   = METHOD + "\n" + PATH(+query) + "\n" + TIMESTAMP + "\n" + sha256_hex(body)
 *   signature = hmac_sha256_hex(payload, site_secret)
 *
 * Headers: X-Staark-Site-ID, X-Staark-Timestamp, X-Staark-Signature.
 * The Hub can therefore verify Next.js sites with the code it already uses for
 * WordPress sites, and sign its webhooks to the site the same way.
 */

export const SIGNATURE_MAX_SKEW_SECONDS = 300;

export type SignedHeaders = {
  "X-Staark-Site-ID": string;
  "X-Staark-Timestamp": string;
  "X-Staark-Signature": string;
};

export function sha256Hex(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function signaturePayload(method: string, path: string, timestamp: string, body: string): string {
  return [method.toUpperCase(), path, timestamp, sha256Hex(body)].join("\n");
}

export function sign(method: string, path: string, timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(signaturePayload(method, path, timestamp, body), "utf8").digest("hex");
}

export function signRequest(input: {
  method: string;
  path: string;
  body?: string;
  siteId: string;
  secret: string;
  now?: number;
}): SignedHeaders {
  const timestamp = String(Math.floor((input.now ?? Date.now()) / 1000));
  return {
    "X-Staark-Site-ID": input.siteId,
    "X-Staark-Timestamp": timestamp,
    "X-Staark-Signature": sign(input.method, input.path, timestamp, input.body ?? "", input.secret),
  };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "expired" | "site" | "signature" };

export function verifySignature(input: {
  method: string;
  path: string;
  body: string;
  headers: Headers;
  siteId: string;
  secret: string;
  now?: number;
  maxSkewSeconds?: number;
}): VerifyResult {
  const siteId = input.headers.get("x-staark-site-id");
  const timestamp = input.headers.get("x-staark-timestamp");
  const signature = input.headers.get("x-staark-signature");
  if (!siteId || !timestamp || !signature) return { ok: false, reason: "missing" };
  if (siteId !== input.siteId) return { ok: false, reason: "site" };

  const now = Math.floor((input.now ?? Date.now()) / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > (input.maxSkewSeconds ?? SIGNATURE_MAX_SKEW_SECONDS)) {
    return { ok: false, reason: "expired" };
  }

  const expected = Buffer.from(sign(input.method, input.path, timestamp, input.body, input.secret), "utf8");
  const given = Buffer.from(signature, "utf8");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "signature" };
  }
  return { ok: true };
}

/**
 * Time-trap token for public forms, like `form_sig` in the WordPress forms
 * module: proves the form was rendered by this site and lets the handler reject
 * submissions that arrive too fast (bots) or too late (replays).
 */
export function issueFormToken(formId: string, secret: string, now = Date.now()): string {
  const startedAt = String(Math.floor(now / 1000));
  const mac = createHmac("sha256", secret).update(`form|${formId}|${startedAt}`).digest("base64url");
  return `${startedAt}.${mac}`;
}

export type FormTokenCheck = { ok: true } | { ok: false; reason: "format" | "signature" | "too_fast" | "expired" };

export function checkFormToken(
  token: string,
  formId: string,
  secret: string,
  opts: { now?: number; minSeconds?: number; maxSeconds?: number } = {},
): FormTokenCheck {
  const [startedAt, mac] = token.split(".");
  if (!startedAt || !mac || !/^\d+$/.test(startedAt)) return { ok: false, reason: "format" };
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`form|${formId}|${startedAt}`).digest("base64url"),
  );
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };

  const age = Math.floor((opts.now ?? Date.now()) / 1000) - Number(startedAt);
  if (age < (opts.minSeconds ?? 3)) return { ok: false, reason: "too_fast" };
  if (age > (opts.maxSeconds ?? 60 * 60 * 6)) return { ok: false, reason: "expired" };
  return { ok: true };
}
