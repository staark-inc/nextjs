import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_REMEMBER_TTL_SECONDS,
  ADMIN_SESSION_TTL_SECONDS,
  clientAddress,
  createLoginRateLimiter,
  resolveAdminAuthConfig,
  resolveAdminLoginAccount,
  type AdminAuthConfig,
  type AdminRole,
  type LoginRateLimiter,
} from "@staark/platform/server";
import { getSession } from "@/lib/auth";
import { resolveSaasLoginAccount } from "@/lib/saas-auth";

// Keep one limiter per server process, also across dev hot reloads.
const globalForLimiter = globalThis as typeof globalThis & { __staarkLoginLimiter?: LoginRateLimiter };
const limiter = (globalForLimiter.__staarkLoginLimiter ??= createLoginRateLimiter({
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000,
  lockMs: 10 * 60 * 1000,
}));

const MAX_FIELD_LENGTH = 512;

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, code: "rate_limited", retryAfter: retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  const key = clientAddress(req.headers);
  const gate = limiter.check(key);
  if (!gate.allowed) return tooManyAttempts(gate.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const { username, password, remember } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
    remember?: unknown;
  };
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    (remember !== undefined && typeof remember !== "boolean") ||
    !username ||
    !password ||
    username.length > MAX_FIELD_LENGTH ||
    password.length > MAX_FIELD_LENGTH
  ) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  let account: { username: string; role: AdminRole } | null = await resolveSaasLoginAccount(
    {
      host: req.headers.get("host"),
      forwardedHost: req.headers.get("x-forwarded-host"),
    },
    username,
    password,
  );

  if (!account) {
    try {
      const config: AdminAuthConfig = resolveAdminAuthConfig();
      account = resolveAdminLoginAccount(config, { username, password });
    } catch {
      account = null;
    }
  }

  if (!account) {
    const after = limiter.recordFailure(key);
    if (!after.allowed) return tooManyAttempts(after.retryAfterSeconds);
    return NextResponse.json({ ok: false, code: "invalid", remaining: after.remaining }, { status: 401 });
  }

  limiter.reset(key);

  const session = await getSession();
  const loginAt = Date.now();
  const remembered = remember === true;
  const ttlSeconds = remembered ? ADMIN_REMEMBER_TTL_SECONDS : ADMIN_SESSION_TTL_SECONDS;

  session.isLoggedIn = true;
  session.username = account.username;
  session.role = account.role;
  session.loginAt = loginAt;
  session.expiresAt = loginAt + ttlSeconds * 1000;
  session.remember = remembered;
  await session.save();

  return NextResponse.json({
    ok: true,
    expiresAt: session.expiresAt,
    remember: remembered,
  });
}
