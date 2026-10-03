import { NextResponse } from "next/server";
import { resolveAdminRole, type AdminRole } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";
import {
  getPlanFeatureAccess,
  type PlanFeature,
} from "@/lib/feature-access";
import { resolveAdminTenantContext } from "@/lib/admin-tenant";

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!isSessionActive(session)) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return null;
}


export async function requireRole(...allowed: AdminRole[]): Promise<NextResponse | null> {
  const session = await getSession();

  if (!isSessionActive(session)) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const role = resolveAdminRole(session.role);
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "Not authorized for this admin role." }, { status: 403 });
  }

  return null;
}

export async function requireManager(): Promise<NextResponse | null> {
  return requireRole("manager");
}


export async function requirePlanFeature(
  feature: PlanFeature,
): Promise<NextResponse | null> {
  const session = await getSession();

  if (!isSessionActive(session)) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const role = resolveAdminRole(session.role);

  // Staark Manager always has operational access.
  if (role === "manager") {
    return null;
  }

  const tenant = await resolveAdminTenantContext();

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant could not be resolved." },
      { status: 404 },
    );
  }

  const access = getPlanFeatureAccess(
    tenant.entitlements,
    feature,
  );

  if (!access.enabled) {
    return NextResponse.json(
      {
        error: "This feature is not included in the current plan.",
        feature,
        requiredEntitlement: access.entitlementKey,
      },
      { status: 403 },
    );
  }

  return null;
}
