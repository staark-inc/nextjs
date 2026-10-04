import type {
  AdminRole,
} from "@staark/platform/server";

import type {
  SessionData,
} from "./auth";

import {
  getPrismaClient,
} from "./db/prisma";

import type {
  TenantContext,
} from "./tenant-context";

export type SessionIdentityFailure =
  | "missing_identity"
  | "wrong_scope"
  | "tenant_mismatch"
  | "user_missing"
  | "user_disabled"
  | "membership_missing"
  | "session_revoked";

export type SessionIdentityValidation =
  | {
      ok: true;
      role: AdminRole;
    }
  | {
      ok: false;
      reason:
        SessionIdentityFailure;
    };

export async function validateClientSessionIdentity(
  session: Partial<SessionData>,
  tenant: TenantContext | null,
): Promise<SessionIdentityValidation> {
  if (
    session.role !== "client"
  ) {
    return {
      ok: false,
      reason:
        "wrong_scope",
    };
  }

  if (
    session.authScope !==
      "tenant" ||
    !session.userId ||
    !session.organizationId ||
    !session.siteId ||
    typeof session.sessionVersion !==
      "number"
  ) {
    return {
      ok: false,
      reason:
        "missing_identity",
    };
  }

  if (
    !tenant ||
    !tenant.organizationId
  ) {
    return {
      ok: false,
      reason:
        "tenant_mismatch",
    };
  }

  if (
    session.organizationId !==
      tenant.organizationId ||
    session.siteId !==
      tenant.siteId
  ) {
    return {
      ok: false,
      reason:
        "tenant_mismatch",
    };
  }

  const user =
    await getPrismaClient()
      .user.findUnique({
        where: {
          id: session.userId,
        },

        select: {
          id: true,
          status: true,
          sessionVersion: true,

          memberships: {
            where: {
              organizationId:
                tenant.organizationId,
            },

            select: {
              id: true,
              role: true,
            },

            take: 1,
          },
        },
      });

  if (!user) {
    return {
      ok: false,
      reason:
        "user_missing",
    };
  }

  if (
    user.status !== "active"
  ) {
    return {
      ok: false,
      reason:
        "user_disabled",
    };
  }

  if (
    user.sessionVersion !==
      session.sessionVersion
  ) {
    return {
      ok: false,
      reason:
        "session_revoked",
    };
  }

  if (
    user.memberships.length === 0
  ) {
    return {
      ok: false,
      reason:
        "membership_missing",
    };
  }

  return {
    ok: true,
    role: "client",
  };
}

export function validateManagerSessionScope(
  session: Partial<SessionData>,
): SessionIdentityValidation {
  if (
    session.role !== "manager" ||
    session.authScope !==
      "platform"
  ) {
    return {
      ok: false,
      reason:
        "wrong_scope",
    };
  }

  return {
    ok: true,
    role: "manager",
  };
}
