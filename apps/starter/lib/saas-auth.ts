import { getPrismaClient } from "./db/prisma";
import { resolvePublicContentConfig } from "./content-source";
import { verifyPassword } from "./password";
import {
  decryptTwoFactorSecret,
  hashRecoveryCode,
  verifyTotp,
} from "./two-factor";
import {
  resolveTenantContext,
  type TenantRequestInput,
} from "./tenant-context";

export async function resolveSaasLoginAccount(
  request: TenantRequestInput,
  username: string,
  password: string,
) {
  const config = resolvePublicContentConfig();

  // SaaS customer authentication only exists in PostgreSQL mode.
  // Legacy/local development must not initialize Prisma just to render/login
  // to the classic admin.
  if (config.source !== "postgres") {
    return null;
  }

  const tenant = await resolveTenantContext(request);
  if (!tenant?.organizationId) return null;

  const email = username.trim().toLowerCase();
  const user = await getPrismaClient().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
      memberships: {
        where: { organizationId: tenant.organizationId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (
    !user ||
    user.status !== "active" ||
    !user.passwordHash ||
    user.memberships.length === 0
  ) {
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return null;

  return {
    username: user.email,
    role: "client" as const,
    userId: user.id,
    siteId: tenant.siteId,
    organizationId: tenant.organizationId,
    twoFactorEnabled:
      user.twoFactorEnabled,
    twoFactorSecret:
      user.twoFactorSecret,
    twoFactorRecoveryCodes:
      Array.isArray(
        user.twoFactorRecoveryCodes,
      )
        ? user.twoFactorRecoveryCodes.filter(
            (
              value,
            ): value is string =>
              typeof value === "string",
          )
        : [],
  };
}

export async function verifySaasSecondFactor(
  account: {
    userId: string;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorRecoveryCodes: string[];
  },
  token: string,
): Promise<boolean> {
  if (
    !account.twoFactorEnabled ||
    !account.twoFactorSecret
  ) {
    return true;
  }

  const normalized =
    token.trim();

  try {
    const secret =
      decryptTwoFactorSecret(
        account.twoFactorSecret,
      );

    if (
      verifyTotp(
        secret,
        normalized,
      )
    ) {
      return true;
    }
  } catch {
    return false;
  }

  const recoveryHash =
    hashRecoveryCode(
      normalized,
    );

  if (
    !account
      .twoFactorRecoveryCodes
      .includes(
        recoveryHash,
      )
  ) {
    return false;
  }

  const remaining =
    account
      .twoFactorRecoveryCodes
      .filter(
        (value) =>
          value !==
          recoveryHash,
      );

  await getPrismaClient()
    .user.update({
      where: {
        id: account.userId,
      },

      data: {
        twoFactorRecoveryCodes:
          remaining,
      },
    });

  return true;
}
