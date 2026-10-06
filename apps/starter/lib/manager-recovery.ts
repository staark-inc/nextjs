import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import {
  verifyPassword,
} from "./password.ts";

import {
  verifyTotp,
} from "./two-factor.ts";

export class ManagerRecoveryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "ManagerRecoveryConfigurationError";
  }
}

function digest(
  value: string,
): Buffer {
  return createHash("sha256")
    .update(
      value,
      "utf8",
    )
    .digest();
}

function secureRecoveryEqual(
  expected: string,
  received: string,
): boolean {
  return timingSafeEqual(
    digest(expected),
    digest(received),
  );
}

export type ManagerRecoveryConfig =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      username: string;
      passwordHash: string;
      totpSecret: string;
    };

function value(
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  return env[key]
    ?.trim() ||
    undefined;
}

function enabledValue(
  value: string | undefined,
): boolean {
  if (!value) {
    return false;
  }

  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    value
      .trim()
      .toLowerCase(),
  );
}

/**
 * Database-independent emergency Manager authentication.
 *
 * Credentials are intentionally sourced only from the runtime environment.
 * No Prisma call, Site lookup or tenant database state is required.
 */
export function resolveManagerRecoveryConfig(
  env: NodeJS.ProcessEnv = process.env,
): ManagerRecoveryConfig {
  const enabled =
    enabledValue(
      env
        .STAARK_MANAGER_RECOVERY_ENABLED,
    );

  if (!enabled) {
    return {
      enabled: false,
    };
  }

  const username =
    value(
      env,
      "STAARK_MANAGER_RECOVERY_USERNAME",
    );

  const passwordHash =
    value(
      env,
      "STAARK_MANAGER_RECOVERY_PASSWORD_HASH",
    );

  const totpSecret =
    value(
      env,
      "STAARK_MANAGER_RECOVERY_TOTP_SECRET",
    );

  const missing = [
    !username &&
      "STAARK_MANAGER_RECOVERY_USERNAME",

    !passwordHash &&
      "STAARK_MANAGER_RECOVERY_PASSWORD_HASH",

    !totpSecret &&
      "STAARK_MANAGER_RECOVERY_TOTP_SECRET",
  ].filter(
    (
      item,
    ): item is string =>
      Boolean(item),
  );

  if (
    missing.length
  ) {
    throw new ManagerRecoveryConfigurationError(
      `Manager recovery is enabled but missing: ${missing.join(", ")}.`,
    );
  }

  /*
   * Explicit narrowing for TypeScript.
   * The missing[] check above guarantees the same thing at runtime,
   * but TS cannot infer it through the filtered array.
   */
  if (
    !username ||
    !passwordHash ||
    !totpSecret
  ) {
    throw new ManagerRecoveryConfigurationError(
      "Manager recovery configuration is incomplete.",
    );
  }

  if (
    !passwordHash
      .startsWith(
        "scrypt-v1$",
      )
  ) {
    throw new ManagerRecoveryConfigurationError(
      "STAARK_MANAGER_RECOVERY_PASSWORD_HASH must use scrypt-v1.",
    );
  }

  if (
    !/^[A-Z2-7]+=*$/i.test(
      totpSecret,
    )
  ) {
    throw new ManagerRecoveryConfigurationError(
      "STAARK_MANAGER_RECOVERY_TOTP_SECRET must be Base32.",
    );
  }

  return {
    enabled: true,
    username,
    passwordHash,
    totpSecret,
  };
}

export function managerRecoveryUsernameMatches(
  config: ManagerRecoveryConfig,
  username: string,
): boolean {
  if (
    !config.enabled
  ) {
    return false;
  }

  return secureRecoveryEqual(
    config.username,
    username.trim(),
  );
}

export async function verifyManagerRecoveryPassword(
  config: Extract<
    ManagerRecoveryConfig,
    {
      enabled: true;
    }
  >,
  password: string,
): Promise<boolean> {
  return verifyPassword(
    password,
    config.passwordHash,
  );
}

export function verifyManagerRecoveryTotp(
  config: Extract<
    ManagerRecoveryConfig,
    {
      enabled: true;
    }
  >,
  token: string,
): boolean {
  return verifyTotp(
    config.totpSecret,
    token,
  );
}
