const DEV_ADMIN_USERNAME = "admin";
const DEV_ADMIN_PASSWORD = "admin";
const DEV_SESSION_SECRET = "staark-dev-secret-at-least-32-chars-long!!";

export type AdminAuthConfig = {
  username: string;
  password: string;
  sessionSecret: string;
};

export class StaarkConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaarkConfigurationError";
  }
}

function value(
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  const raw = env[key];
  return raw?.trim() || undefined;
}

/**
 * Resolve only the session encryption secret.
 *
 * This must remain independent from legacy ADMIN_USERNAME / ADMIN_PASSWORD:
 * SaaS tenant sessions and Manager recovery sessions both need to read/write
 * the admin cookie even when local legacy credentials are not configured.
 */
export function resolveAdminSessionSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const production =
    env.NODE_ENV === "production";

  const sessionSecret =
    value(
      env,
      "ADMIN_SESSION_SECRET",
    );

  if (
    production &&
    !sessionSecret
  ) {
    throw new StaarkConfigurationError(
      "Missing production admin configuration: ADMIN_SESSION_SECRET.",
    );
  }

  const resolved =
    sessionSecret ??
    DEV_SESSION_SECRET;

  if (
    resolved.length < 32
  ) {
    throw new StaarkConfigurationError(
      "ADMIN_SESSION_SECRET must contain at least 32 characters.",
    );
  }

  return resolved;
}

/**
 * Resolve legacy/local admin credentials.
 *
 * SaaS customer authentication and Manager recovery authentication do not
 * depend on these credentials.
 */
export function resolveAdminAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdminAuthConfig {
  const production =
    env.NODE_ENV === "production";

  const username =
    value(
      env,
      "ADMIN_USERNAME",
    );

  const password =
    value(
      env,
      "ADMIN_PASSWORD",
    );

  const rawSessionSecret =
    value(
      env,
      "ADMIN_SESSION_SECRET",
    );

  if (production) {
    const missing = [
      !username &&
        "ADMIN_USERNAME",

      !password &&
        "ADMIN_PASSWORD",

      !rawSessionSecret &&
        "ADMIN_SESSION_SECRET",
    ].filter(
      (
        item,
      ): item is string =>
        Boolean(item),
    );

    if (
      missing.length
    ) {
      throw new StaarkConfigurationError(
        `Missing production admin configuration: ${missing.join(", ")}.`,
      );
    }
  }

  const sessionSecret =
    resolveAdminSessionSecret(
      env,
    );

  return {
    username:
      username ??
      DEV_ADMIN_USERNAME,

    password:
      password ??
      DEV_ADMIN_PASSWORD,

    sessionSecret,
  };
}
