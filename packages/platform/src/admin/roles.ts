import { adminCredentialsMatch } from "./login-guard.ts";
import {
  StaarkConfigurationError,
  type AdminAuthConfig,
} from "./auth-config.ts";

export const ADMIN_ROLES = ["client", "manager"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminAccount = {
  username: string;
  password: string;
  role: AdminRole;
};

function envValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = env[key];
  return raw?.trim() || undefined;
}

function pairedCredentials(
  env: NodeJS.ProcessEnv,
  usernameKey: string,
  passwordKey: string,
): { username: string; password: string } | null {
  const username = envValue(env, usernameKey);
  const password = envValue(env, passwordKey);

  if (Boolean(username) !== Boolean(password)) {
    throw new StaarkConfigurationError(
      `${usernameKey} and ${passwordKey} must be configured together.`,
    );
  }

  return username && password ? { username, password } : null;
}

/**
 * 11B2-A role model.
 *
 * - Existing ADMIN_USERNAME / ADMIN_PASSWORD remains the manager account.
 * - ADMIN_MANAGER_* may override the manager credentials.
 * - ADMIN_CLIENT_* creates the client account.
 * - Development gets a convenience client/client account when ADMIN_CLIENT_*
 *   is not configured. Production never receives default client credentials.
 */
export function resolveAdminAccounts(
  baseConfig: AdminAuthConfig,
  env: NodeJS.ProcessEnv = process.env,
): AdminAccount[] {
  const production = env.NODE_ENV === "production";

  const managerOverride = pairedCredentials(
    env,
    "ADMIN_MANAGER_USERNAME",
    "ADMIN_MANAGER_PASSWORD",
  );
  const clientConfigured = pairedCredentials(
    env,
    "ADMIN_CLIENT_USERNAME",
    "ADMIN_CLIENT_PASSWORD",
  );

  const manager: AdminAccount = {
    username: managerOverride?.username ?? baseConfig.username,
    password: managerOverride?.password ?? baseConfig.password,
    role: "manager",
  };

  const clientCredentials =
    clientConfigured ??
    (!production ? { username: "client", password: "client" } : null);

  const accounts: AdminAccount[] = [manager];

  if (clientCredentials) {
    const client: AdminAccount = {
      ...clientCredentials,
      role: "client",
    };

    if (client.username === manager.username) {
      throw new StaarkConfigurationError(
        "Client and manager admin usernames must be different.",
      );
    }

    accounts.push(client);
  }

  return accounts;
}

/**
 * Compare every configured account before returning a match.
 * This keeps login behavior centralized and leaves role assignment server-side.
 */
export function resolveAdminLoginAccount(
  baseConfig: AdminAuthConfig,
  received: { username: string; password: string },
  env: NodeJS.ProcessEnv = process.env,
): AdminAccount | null {
  const accounts = resolveAdminAccounts(baseConfig, env);
  let matched: AdminAccount | null = null;

  for (const account of accounts) {
    const ok = adminCredentialsMatch(account, received);
    if (ok && matched === null) matched = account;
  }

  return matched;
}

/**
 * Old sessions created before 11B2-A have no role. They were full admin
 * sessions, so keep them manager until they naturally expire or sign in again.
 */
export function resolveAdminRole(value: unknown): AdminRole {
  return value === "client" || value === "manager" ? value : "manager";
}
