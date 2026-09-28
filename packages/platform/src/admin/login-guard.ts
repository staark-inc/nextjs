import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** Default absolute lifetime of a local /admin session. */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
/** Maximum lifetime when the user explicitly chooses "Remember me". */
export const ADMIN_REMEMBER_TTL_SECONDS = 30 * 24 * 60 * 60;

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

export type AdminSessionLike = {
  isLoggedIn?: boolean;
  loginAt?: number;
  expiresAt?: number;
};

/**
 * Resolve the application-level absolute expiry.
 *
 * Existing sessions created before Remember me was introduced do not contain
 * `expiresAt`, so they retain the original 12-hour behavior. Explicit expiries
 * are capped at the 30-day product maximum.
 */
export function adminSessionExpiresAt(
  session: AdminSessionLike | null | undefined,
): number | null {
  const loginAt = session?.loginAt;
  if (typeof loginAt !== "number" || !Number.isFinite(loginAt)) return null;

  const explicit = session?.expiresAt;
  const maxExpiry = loginAt + ADMIN_REMEMBER_TTL_SECONDS * 1000;
  if (
    typeof explicit === "number" &&
    Number.isFinite(explicit) &&
    explicit >= loginAt &&
    explicit <= maxExpiry
  ) {
    return explicit;
  }

  return loginAt + ADMIN_SESSION_TTL_SECONDS * 1000;
}

/** A session is active only while its signed absolute expiry is in the future. */
export function isAdminSessionActive(
  session: AdminSessionLike | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!session?.isLoggedIn) return false;
  const loginAt = session.loginAt;
  const expiresAt = adminSessionExpiresAt(session);
  if (typeof loginAt !== "number" || !Number.isFinite(loginAt) || expiresAt === null) return false;
  return now >= loginAt && now < expiresAt;
}

/**
 * Sanitize the `?next=` target used after sign-in. Only same-origin paths
 * inside /admin are allowed; anything else falls back to the dashboard.
 */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw) return ADMIN_HOME_PATH;
  const value = raw.trim();
  if (value.length > 512) return ADMIN_HOME_PATH;
  if (!value.startsWith("/") || value.startsWith("//")) return ADMIN_HOME_PATH;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return ADMIN_HOME_PATH;

  let url: URL;
  try {
    url = new URL(value, "http://staark.invalid");
  } catch {
    return ADMIN_HOME_PATH;
  }
  if (url.origin !== "http://staark.invalid") return ADMIN_HOME_PATH;

  const { pathname } = url;
  const inAdmin = pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
  if (!inAdmin) return ADMIN_HOME_PATH;
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`)) return ADMIN_HOME_PATH;

  return `${pathname}${url.search}`;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time string comparison (length is hidden by hashing first). */
export function secureEqual(expected: string, received: string): boolean {
  return timingSafeEqual(digest(expected), digest(received));
}

/**
 * Compare both fields without short-circuiting, so a wrong username takes as
 * long as a wrong password.
 */
export function adminCredentialsMatch(
  expected: { username: string; password: string },
  received: { username: string; password: string },
): boolean {
  const userOk = secureEqual(expected.username, received.username);
  const passOk = secureEqual(expected.password, received.password);
  return userOk && passOk;
}

/**
 * Stable client key for rate limiting.
 * Forwarded headers are ignored unless the reverse proxy is explicitly trusted.
 */
export function clientAddress(
  headers: Headers,
  trustProxy: boolean = process.env.STAARK_TRUST_PROXY === "1",
): string {
  if (!trustProxy) return "direct";

  const candidates = [
    headers.get("cf-connecting-ip")?.trim(),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip")?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) return candidate;
  }

  return "proxy";
}

export type LoginRateLimitOptions = {
  /** Failed attempts allowed inside the window before locking. */
  maxAttempts?: number;
  /** Window in which failures are counted. */
  windowMs?: number;
  /** How long a key stays locked once it hits maxAttempts. */
  lockMs?: number;
};

export type LoginGate =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

type Entry = { failures: number; windowStart: number; lockedUntil: number };

/**
 * In-memory limiter for the local admin login. It is per server instance,
 * which matches a single-container client deployment. Put a shared store in
 * front of it if a deployment ever runs several replicas.
 */
export function createLoginRateLimiter(options: LoginRateLimitOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const windowMs = options.windowMs ?? 10 * 60 * 1000;
  const lockMs = options.lockMs ?? 10 * 60 * 1000;
  const entries = new Map<string, Entry>();

  function prune(now: number) {
    if (entries.size < 500) return;
    for (const [key, entry] of entries) {
      if (entry.lockedUntil <= now && now - entry.windowStart >= windowMs) entries.delete(key);
    }
  }

  function current(key: string, now: number): Entry | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.lockedUntil > now) return entry;
    if (now - entry.windowStart >= windowMs) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  function gate(entry: Entry | undefined, now: number): LoginGate {
    if (entry && entry.lockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)) };
    }
    return { allowed: true, remaining: maxAttempts - (entry?.failures ?? 0) };
  }

  return {
    check(key: string, now: number = Date.now()): LoginGate {
      prune(now);
      return gate(current(key, now), now);
    },
    recordFailure(key: string, now: number = Date.now()): LoginGate {
      let entry = current(key, now);
      if (entry && entry.lockedUntil > now) return gate(entry, now);
      if (!entry || entry.lockedUntil > 0) {
        entry = { failures: 0, windowStart: now, lockedUntil: 0 };
        entries.set(key, entry);
      }
      entry.failures += 1;
      if (entry.failures >= maxAttempts) entry.lockedUntil = now + lockMs;
      return gate(entry, now);
    },
    reset(key: string): void {
      entries.delete(key);
    },
  };
}

export type LoginRateLimiter = ReturnType<typeof createLoginRateLimiter>;
