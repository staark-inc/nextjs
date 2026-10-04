import {
  NextResponse,
} from "next/server";

import {
  resolveAdminRole,
  type AdminRole,
} from "@staark/platform/server";

import {
  getSession,
  isSessionActive,
} from "@/lib/auth";

import {
  getPlanFeatureAccess,
  type PlanFeature,
} from "@/lib/feature-access";

import {
  resolveAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  validateClientSessionIdentity,
  validateManagerSessionScope,
} from "@/lib/session-identity";

async function validateIdentity() {
  const session =
    await getSession();

  if (
    !isSessionActive(
      session,
    )
  ) {
    return {
      session,
      role: null,
      error:
        NextResponse.json(
          {
            ok: false,
            code:
              "NOT_AUTHENTICATED",
            error:
              "Not authenticated.",
          },
          {
            status: 401,
          },
        ),
    };
  }

  const role =
    resolveAdminRole(
      session.role,
    );

  if (
    role === "manager"
  ) {
    const validation =
      validateManagerSessionScope(
        session,
      );

    if (!validation.ok) {
      session.destroy();

      return {
        session,
        role,
        error:
          NextResponse.json(
            {
              ok: false,
              code:
                "SESSION_SCOPE_INVALID",
              error:
                "Session scope is invalid.",
            },
            {
              status: 401,
            },
          ),
      };
    }

    return {
      session,
      role,
      error: null,
    };
  }

  const tenant =
    await resolveAdminTenantContext();

  const validation =
    await validateClientSessionIdentity(
      session,
      tenant,
    );

  if (!validation.ok) {
    session.destroy();

    return {
      session,
      role,
      error:
        NextResponse.json(
          {
            ok: false,
            code:
              "SESSION_IDENTITY_INVALID",
            reason:
              validation.reason,
            error:
              "Your session is no longer valid. Sign in again.",
          },
          {
            status: 401,
          },
        ),
    };
  }

  return {
    session,
    role,
    error: null,
  };
}

export async function requireAuth():
Promise<NextResponse | null> {
  const result =
    await validateIdentity();

  return result.error;
}

export async function requireRole(
  ...allowed: AdminRole[]
): Promise<NextResponse | null> {
  const result =
    await validateIdentity();

  if (result.error) {
    return result.error;
  }

  if (
    !result.role ||
    !allowed.includes(
      result.role,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "ROLE_FORBIDDEN",
        error:
          "Not authorized for this admin role.",
      },
      {
        status: 403,
      },
    );
  }

  return null;
}

export async function requireManager():
Promise<NextResponse | null> {
  return requireRole(
    "manager",
  );
}

export async function requirePlanFeature(
  feature: PlanFeature,
): Promise<NextResponse | null> {
  const result =
    await validateIdentity();

  if (result.error) {
    return result.error;
  }

  if (
    result.role === "manager"
  ) {
    return null;
  }

  const tenant =
    await resolveAdminTenantContext();

  if (!tenant) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "TENANT_NOT_FOUND",
        error:
          "Tenant could not be resolved.",
      },
      {
        status: 404,
      },
    );
  }

  const access =
    getPlanFeatureAccess(
      tenant.entitlements,
      feature,
    );

  if (!access.enabled) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "PLAN_FEATURE_REQUIRED",
        error:
          "This feature is not included in the current plan.",
        feature,
        requiredEntitlement:
          access.entitlementKey,
      },
      {
        status: 403,
      },
    );
  }

  return null;
}
