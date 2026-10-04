const SAFE_METHODS =
  new Set([
    "GET",
    "HEAD",
    "OPTIONS",
  ]);

/*
 * Kept local on purpose:
 * this security primitive is loaded directly by Node's native TS test runner,
 * so it must stay dependency-free and usable outside the Next.js module graph.
 */
function normalizeHostname(
  value: string | null | undefined,
): string {
  const raw =
    value
      ?.split(",")[0]
      ?.trim()
      .toLowerCase() ??
    "";

  if (!raw) {
    return "";
  }

  const withoutPort =
    raw.replace(
      /:\d+$/,
      "",
    );

  return withoutPort.endsWith(".")
    ? withoutPort.slice(
        0,
        -1,
      )
    : withoutPort;
}

function resolveRequestHostname(
  input: {
    host?: string | null;
    forwardedHost?: string | null;
  },
  env: NodeJS.ProcessEnv,
): string {
  const trustProxy =
    env.STAARK_TRUST_PROXY ===
    "1";

  return normalizeHostname(
    trustProxy &&
      input.forwardedHost
      ? input.forwardedHost
      : input.host,
  );
}

export type AdminRequestSecurityResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code:
        | "ADMIN_ORIGIN_REQUIRED"
        | "ADMIN_ORIGIN_FORBIDDEN"
        | "ADMIN_FETCH_SITE_FORBIDDEN"
        | "ADMIN_HOST_REQUIRED";
      reason: string;
    };

type HeaderReader = {
  get(name: string): string | null;
};

export type AdminRequestSecurityInput = {
  method: string;
  headers: HeaderReader;
};

/**
 * Protect cookie-authenticated Admin mutation routes against CSRF.
 *
 * Rules:
 * - safe methods are unaffected;
 * - cross-site and same-site Fetch Metadata requests are rejected;
 * - mutation requests must prove their browser origin using Origin or Referer;
 * - the origin hostname must exactly match the hostname the runtime resolves
 *   for this request.
 *
 * Exact hostname matching is intentional. customer-a.staark.app must never
 * be accepted as the origin for customer-b.staark.app.
 */
export function validateAdminRequestOrigin(
  request: AdminRequestSecurityInput,
  env: NodeJS.ProcessEnv = process.env,
): AdminRequestSecurityResult {
  const method =
    request.method
      .trim()
      .toUpperCase();

  if (
    SAFE_METHODS.has(
      method,
    )
  ) {
    return {
      ok: true,
    };
  }

  const fetchSite =
    request.headers
      .get(
        "sec-fetch-site",
      )
      ?.trim()
      .toLowerCase();

  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "none"
  ) {
    return {
      ok: false,
      code:
        "ADMIN_FETCH_SITE_FORBIDDEN",
      reason:
        "Admin mutations must originate from the same browser origin.",
    };
  }

  const requestHost =
    resolveRequestHostname(
      {
        host:
          request.headers.get(
            "host",
          ),

        forwardedHost:
          request.headers.get(
            "x-forwarded-host",
          ),
      },
      env,
    );

  if (!requestHost) {
    return {
      ok: false,
      code:
        "ADMIN_HOST_REQUIRED",
      reason:
        "Admin request hostname could not be resolved.",
    };
  }

  const origin =
    request.headers
      .get("origin")
      ?.trim();

  const referer =
    request.headers
      .get("referer")
      ?.trim();

  /*
   * Modern browser mutation requests normally contain Origin.
   * Referer is retained as a compatibility fallback for browser/navigation
   * paths that legitimately omit Origin.
   */
  const proof =
    origin ||
    referer;

  if (!proof) {
    return {
      ok: false,
      code:
        "ADMIN_ORIGIN_REQUIRED",
      reason:
        "Admin mutations require a same-origin browser request.",
    };
  }

  try {
    const url =
      new URL(proof);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return {
        ok: false,
        code:
          "ADMIN_ORIGIN_FORBIDDEN",
        reason:
          "Admin mutation origin uses an unsupported protocol.",
      };
    }

    const originHost =
      normalizeHostname(
        url.host,
      );

    if (
      !originHost ||
      originHost !== requestHost
    ) {
      return {
        ok: false,
        code:
          "ADMIN_ORIGIN_FORBIDDEN",
        reason:
          "Admin mutation origin does not match this tenant hostname.",
      };
    }
  } catch {
    return {
      ok: false,
      code:
        "ADMIN_ORIGIN_FORBIDDEN",
      reason:
        "Admin mutation origin is invalid.",
    };
  }

  return {
    ok: true,
  };
}
