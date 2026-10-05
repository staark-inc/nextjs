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
import { appendAdminLog } from "@/lib/admin-logs";
import {
  resolveSaasLoginAccount,
  verifySaasSecondFactor,
} from "@/lib/saas-auth";

// Keep one limiter per server process, also across dev hot reloads.
const globalForLimiter = globalThis as typeof globalThis & {
  __staarkLoginLimiter?: LoginRateLimiter;
};

const limiter = (
  globalForLimiter.__staarkLoginLimiter ??=
    createLoginRateLimiter({
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000,
      lockMs: 10 * 60 * 1000,
    })
);

const MAX_FIELD_LENGTH = 512;

function tooManyAttempts(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      ok: false,
      code: "rate_limited",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          retryAfterSeconds,
        ),
      },
    },
  );
}

function requestHost(
  req: NextRequest,
): string {
  return (
    req.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim() ||
    req.headers
      .get("host")
      ?.trim() ||
    "unknown"
  );
}

async function authLog(
  input: {
    level?:
      | "debug"
      | "info"
      | "warning"
      | "error"
      | "critical";
    action: string;
    message: string;
    host: string;
    durationMs?: number;
    result?: string;
    role?: string;
    authScope?: string;
    errorName?: string;
  },
): Promise<void> {
  await appendAdminLog({
    level:
      input.level ?? "info",

    area: "auth",
    action: input.action,
    message: input.message,

    actor: "system",
    actorRole: "system",

    meta: {
      host:
        input.host,

      ...(input.durationMs !== undefined
        ? {
            durationMs:
              input.durationMs,
          }
        : {}),

      ...(input.result
        ? {
            result:
              input.result,
          }
        : {}),

      ...(input.role
        ? {
            role:
              input.role,
          }
        : {}),

      ...(input.authScope
        ? {
            authScope:
              input.authScope,
          }
        : {}),

      ...(input.errorName
        ? {
            errorName:
              input.errorName,
          }
        : {}),
    },
  });
}

export async function POST(
  req: NextRequest,
) {
  const startedAt =
    Date.now();

  const host =
    requestHost(req);

  await authLog({
    action: "login.started",
    message:
      "Admin login attempt started.",
    host,
  });

  const address =
    clientAddress(
      req.headers,
    );

  const key =
    `${host.toLowerCase()}|${address}`;

  const gate =
    limiter.check(key);

  if (!gate.allowed) {
    await authLog({
      level: "warning",
      action:
        "login.rate_limited",
      message:
        "Admin login attempt was rate limited.",
      host,
      durationMs:
        Date.now() -
        startedAt,
      result:
        "rate_limited",
    });

    return tooManyAttempts(
      gate.retryAfterSeconds,
    );
  }

  let body: unknown;

  try {
    body =
      await req.json();
  } catch {
    await authLog({
      level: "warning",
      action:
        "login.bad_request",
      message:
        "Admin login request body could not be parsed.",
      host,
      durationMs:
        Date.now() -
        startedAt,
      result:
        "bad_request",
    });

    return NextResponse.json(
      {
        ok: false,
        code: "bad_request",
      },
      {
        status: 400,
      },
    );
  }

  const {
    username,
    password,
    remember,
    twoFactorCode,
  } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
    remember?: unknown;
    twoFactorCode?: unknown;
  };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    (
      remember !== undefined &&
      typeof remember !==
        "boolean"
    ) ||
    (
      twoFactorCode !==
        undefined &&
      typeof twoFactorCode !==
        "string"
    ) ||
    !username ||
    !password ||
    username.length >
      MAX_FIELD_LENGTH ||
    password.length >
      MAX_FIELD_LENGTH
  ) {
    await authLog({
      level: "warning",
      action:
        "login.bad_request",
      message:
        "Admin login request fields were invalid.",
      host,
      durationMs:
        Date.now() -
        startedAt,
      result:
        "bad_request",
    });

    return NextResponse.json(
      {
        ok: false,
        code: "bad_request",
      },
      {
        status: 400,
      },
    );
  }

  const saasStartedAt =
    Date.now();

  await authLog({
    action:
      "saas_lookup.started",
    message:
      "SaaS account lookup started.",
    host,
  });

  let saasAccount:
    Awaited<
      ReturnType<
        typeof resolveSaasLoginAccount
      >
    >;

  try {
    saasAccount =
      await resolveSaasLoginAccount(
        {
          host:
            req.headers.get(
              "host",
            ),

          forwardedHost:
            req.headers.get(
              "x-forwarded-host",
            ),
        },
        username,
        password,
      );

    await authLog({
      action:
        "saas_lookup.finished",
      message:
        "SaaS account lookup finished.",
      host,
      durationMs:
        Date.now() -
        saasStartedAt,
      result:
        saasAccount
          ? "account_found"
          : "no_account",
      role:
        saasAccount?.role,
    });
  } catch (error) {
    await authLog({
      level: "error",
      action:
        "saas_lookup.failed",
      message:
        "SaaS account lookup failed.",
      host,
      durationMs:
        Date.now() -
        saasStartedAt,
      result:
        "exception",
      errorName:
        error instanceof Error
          ? error.name
          : "unknown",
    });

    console.error(
      "[staark] SaaS login lookup failed:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    throw error;
  }

  let account:
    {
      username: string;
      role: AdminRole;
    } | null =
      saasAccount;

  if (
    saasAccount
      ?.twoFactorEnabled
  ) {
    if (
      typeof twoFactorCode !==
        "string" ||
      !twoFactorCode.trim()
    ) {
      await authLog({
        action:
          "two_factor.required",
        message:
          "SaaS login requires a second factor.",
        host,
        durationMs:
          Date.now() -
          startedAt,
        result:
          "required",
        role:
          saasAccount.role,
      });

      return NextResponse.json(
        {
          ok: false,
          code:
            "two_factor_required",
        },
        {
          status: 202,
        },
      );
    }

    const secondFactorStartedAt =
      Date.now();

    await authLog({
      action:
        "two_factor.started",
      message:
        "Second-factor verification started.",
      host,
    });

    const validSecondFactor =
      await verifySaasSecondFactor(
        saasAccount,
        twoFactorCode,
      );

    await authLog({
      level:
        validSecondFactor
          ? "info"
          : "warning",
      action:
        validSecondFactor
          ? "two_factor.valid"
          : "two_factor.invalid",
      message:
        validSecondFactor
          ? "Second-factor verification succeeded."
          : "Second-factor verification failed.",
      host,
      durationMs:
        Date.now() -
        secondFactorStartedAt,
      result:
        validSecondFactor
          ? "valid"
          : "invalid",
      role:
        saasAccount.role,
    });

    if (
      !validSecondFactor
    ) {
      const after =
        limiter.recordFailure(
          key,
        );

      if (
        !after.allowed
      ) {
        await authLog({
          level:
            "warning",
          action:
            "login.rate_limited",
          message:
            "Admin login was rate limited after an invalid second factor.",
          host,
          durationMs:
            Date.now() -
            startedAt,
          result:
            "rate_limited",
        });

        return tooManyAttempts(
          after.retryAfterSeconds,
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code:
            "two_factor_invalid",
          remaining:
            after.remaining,
        },
        {
          status: 401,
        },
      );
    }
  }

  if (!account) {
    const fallbackStartedAt =
      Date.now();

    await authLog({
      action:
        "platform_fallback.started",
      message:
        "Platform admin fallback lookup started.",
      host,
    });

    try {
      const config:
        AdminAuthConfig =
        resolveAdminAuthConfig();

      account =
        resolveAdminLoginAccount(
          config,
          {
            username,
            password,
          },
        );

      await authLog({
        action:
          "platform_fallback.finished",
        message:
          "Platform admin fallback lookup finished.",
        host,
        durationMs:
          Date.now() -
          fallbackStartedAt,
        result:
          account
            ? "account_found"
            : "no_account",
        role:
          account?.role,
      });
    } catch (error) {
      account = null;

      await authLog({
        level: "warning",
        action:
          "platform_fallback.failed",
        message:
          "Platform admin fallback is unavailable.",
        host,
        durationMs:
          Date.now() -
          fallbackStartedAt,
        result:
          "configuration_error",
        errorName:
          error instanceof Error
            ? error.name
            : "unknown",
      });
    }
  }

  if (!account) {
    const after =
      limiter.recordFailure(
        key,
      );

    await authLog({
      level: "warning",
      action:
        "login.failed",
      message:
        "Admin login failed.",
      host,
      durationMs:
        Date.now() -
        startedAt,
      result:
        "invalid_credentials",
    });

    if (
      !after.allowed
    ) {
      return tooManyAttempts(
        after.retryAfterSeconds,
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "invalid",
        remaining:
          after.remaining,
      },
      {
        status: 401,
      },
    );
  }

  limiter.reset(key);

  const sessionStartedAt =
    Date.now();

  await authLog({
    action:
      "session.started",
    message:
      "Admin session creation started.",
    host,
    role:
      account.role,
  });

  const session =
    await getSession();

  const loginAt =
    Date.now();

  const remembered =
    remember === true;

  const ttlSeconds =
    remembered
      ? ADMIN_REMEMBER_TTL_SECONDS
      : ADMIN_SESSION_TTL_SECONDS;

  session.isLoggedIn =
    true;

  session.username =
    account.username;

  session.role =
    account.role;

  if (saasAccount) {
    session.userId =
      saasAccount.userId;

    session.organizationId =
      saasAccount.organizationId;

    session.siteId =
      saasAccount.siteId;

    session.sessionVersion =
      saasAccount.sessionVersion;

    session.authScope =
      "tenant";
  } else {
    session.userId =
      undefined;

    session.organizationId =
      undefined;

    session.siteId =
      undefined;

    session.sessionVersion =
      undefined;

    session.authScope =
      "platform";
  }

  session.loginAt =
    loginAt;

  session.expiresAt =
    loginAt +
    ttlSeconds * 1000;

  session.remember =
    remembered;

  await session.save();

  await authLog({
    action:
      "session.finished",
    message:
      "Admin session creation finished.",
    host,
    durationMs:
      Date.now() -
      sessionStartedAt,
    result:
      "success",
    role:
      account.role,
    authScope:
      saasAccount
        ? "tenant"
        : "platform",
  });

  await authLog({
    action:
      "login.success",
    message:
      "Admin login succeeded.",
    host,
    durationMs:
      Date.now() -
      startedAt,
    result:
      "success",
    role:
      account.role,
    authScope:
      saasAccount
        ? "tenant"
        : "platform",
  });

  return NextResponse.json({
    ok: true,
    expiresAt:
      session.expiresAt,
    remember:
      remembered,
  });
}
