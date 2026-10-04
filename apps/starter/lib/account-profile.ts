import {
  resolveAdminRole,
} from "@staark/platform/server";

import {
  getSession,
  isSessionActive,
} from "./auth";

import {
  resolveAdminTenantContext,
} from "./admin-tenant";

import {
  getPrismaClient,
} from "./db/prisma";

export async function requireClientAccount() {
  const session =
    await getSession();

  if (
    !isSessionActive(session) ||
    resolveAdminRole(
      session.role,
    ) !== "client" ||
    !session.username
  ) {
    throw new Error(
      "ACCOUNT_NOT_AUTHORIZED",
    );
  }

  const tenant =
    await resolveAdminTenantContext();

  if (
    !tenant?.organizationId
  ) {
    throw new Error(
      "ACCOUNT_TENANT_MISSING",
    );
  }

  const email =
    session.username
      .trim()
      .toLowerCase();

  const prisma =
    getPrismaClient();

  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },

      include: {
        memberships: {
          where: {
            organizationId:
              tenant.organizationId,
          },

          take: 1,
        },
      },
    });

  if (
    !user ||
    user.memberships.length === 0
  ) {
    throw new Error(
      "ACCOUNT_NOT_FOUND",
    );
  }

  return {
    session,
    tenant,
    user,
    prisma,
  };
}
