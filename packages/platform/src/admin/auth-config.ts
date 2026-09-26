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

function value(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = env[key];
  return raw?.trim() || undefined;
}

/**
 * Resolve local-admin authentication settings.
 *
 * Development keeps explicit convenience defaults so a fresh fixture deployment
 * remains easy to run. Production never receives default credentials or a
 * default session secret: missing values are a configuration error.
 */
export function resolveAdminAuthConfig(env: NodeJS.ProcessEnv = process.env): AdminAuthConfig {
  const production = env.NODE_ENV === "production";
  const username = value(env, "ADMIN_USERNAME");
  const password = value(env, "ADMIN_PASSWORD");
  const sessionSecret = value(env, "ADMIN_SESSION_SECRET");

  if (production) {
    const missing = [
      !username && "ADMIN_USERNAME",
      !password && "ADMIN_PASSWORD",
      !sessionSecret && "ADMIN_SESSION_SECRET",
    ].filter((item): item is string => Boolean(item));

    if (missing.length) {
      throw new StaarkConfigurationError(
        `Missing production admin configuration: ${missing.join(", ")}. Set explicit local /admin credentials and a session secret before starting the deployment.`,
      );
    }
  }

  const resolved: AdminAuthConfig = {
    username: username ?? DEV_ADMIN_USERNAME,
    password: password ?? DEV_ADMIN_PASSWORD,
    sessionSecret: sessionSecret ?? DEV_SESSION_SECRET,
  };

  if (resolved.sessionSecret.length < 32) {
    throw new StaarkConfigurationError("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }

  return resolved;
}
