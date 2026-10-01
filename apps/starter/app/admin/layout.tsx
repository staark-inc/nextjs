import type { Metadata } from "next";
import { resolveAdminRole } from "@staark/platform/server";
import type { WebsiteType } from "@staark/core";
import { adminSessionExpiresAt } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";
import { getPrismaClient } from "@/lib/db/prisma";
import { normalizeWebsiteType } from "@/lib/website-profile";
import { peekAdminShellStatus } from "@/lib/admin-shell-status";
import {
  resolveAccessibleAdminFeatures,
  resolveAdminEntitlements,
} from "@/lib/admin-features";
import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import { resolveAdminTenantContext } from "@/lib/admin-tenant";
import { adminFeaturesFromPlanEntitlements } from "@/lib/plan-entitlements";
import AdminShell from "./AdminShell";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staark Hub · NextJS Platform", robots: "noindex" };

async function resolveDisplayName(
  username: string | undefined,
  role: ReturnType<typeof resolveAdminRole>,
): Promise<string> {
  const fallback = username?.trim() || "Admin";

  if (role !== "client" || !fallback.includes("@")) {
    return fallback;
  }

  try {
    const user = await getPrismaClient().user.findUnique({
      where: { email: fallback.toLowerCase() },
      select: { name: true },
    });

    return user?.name?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin config may be missing (e.g. ADMIN_* unset in production). Never let that
  // throw during render — treat it as "not signed in" and show the child (the
  // login page). The auth API then reports the configuration problem on submit.
  let session: Awaited<ReturnType<typeof getSession>> | null = null;
  try {
    session = await getSession();
  } catch {
    return children;
  }

  if (!isSessionActive(session)) return children;

  let site: Awaited<
    ReturnType<typeof readAdminSiteSettings>
  > | null = null;

  try {
    site = await readAdminSiteSettings();
  } catch {
    // Admin remains usable if the active content source
    // is temporarily unavailable.
  }

  const websiteType: WebsiteType =
    normalizeWebsiteType(site?.websiteType);

  const role = resolveAdminRole(session.role);

  const tenant =
    await resolveAdminTenantContext();

  const planFeatures =
    adminFeaturesFromPlanEntitlements(
      tenant?.entitlements ?? {},
    );

  const features =
    resolveAccessibleAdminFeatures(
      role,
      process.env,
      planFeatures,
    );

  const entitlements =
    resolveAdminEntitlements(
      process.env,
      planFeatures,
    );

  const status =
    await peekAdminShellStatus();

  const displayName =
    await resolveDisplayName(session.username, role);

  const initialNow = Date.now();

  const sessionExpiresAt =
    adminSessionExpiresAt(session) ??
    initialNow;

  return (
    <AdminShell
      websiteType={websiteType}
      siteName={site?.name?.trim() || "Staark Hub"}
      username={displayName}
      role={role}
      features={features}
      entitlements={entitlements}
      sessionExpiresAt={sessionExpiresAt}
      initialNow={initialNow}
      initialStatus={status}
      development={process.env.NODE_ENV !== "production"}
    >
      {children}
    </AdminShell>
  );
}
