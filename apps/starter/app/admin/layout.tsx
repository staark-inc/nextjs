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
import { resolveAdminTenant } from "@/lib/admin-tenant";
import { refreshAdminRecoveryBundle } from "@/lib/admin-recovery-bundle";
import { adminFeaturesFromPlanEntitlements } from "@/lib/plan-entitlements";
import { getSubscriptionAccessPolicy } from "@/lib/subscription-access";
import AdminShell from "./AdminShell";
import "./admin.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let siteName =
    "Staark";

  try {
    const site =
      await readAdminSiteSettings();

    siteName =
      site.name?.trim() ||
      siteName;
  } catch {
    // Keep a safe title when tenant settings are unavailable.
  }

  return {
    title:
      `${siteName} · Staark Inc Platform`,

    robots:
      "noindex",
  };
}

async function resolveDisplayName(
  username: string | undefined,
  role: ReturnType<typeof resolveAdminRole>,
): Promise<string> {
  const fallback =
    username?.trim() ||
    "Admin";

  if (
    role !== "client" ||
    !fallback.includes("@")
  ) {
    return fallback;
  }

  try {
    const user =
      await getPrismaClient()
        .user
        .findUnique({
          where: {
            email:
              fallback.toLowerCase(),
          },
          select: {
            name: true,
          },
        });

    return (
      user?.name?.trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session:
    Awaited<
      ReturnType<typeof getSession>
    > | null =
    null;

  try {
    session =
      await getSession();
  } catch {
    return children;
  }

  if (
    !isSessionActive(
      session,
    )
  ) {
    return children;
  }

  const role =
    resolveAdminRole(
      session.role,
    );

  const managerRecovery =
    role === "manager" &&
    session.recoveryMode ===
      true;

  let tenantResolution:
    Awaited<
      ReturnType<
        typeof resolveAdminTenant
      >
    > | null =
    null;

  try {
    tenantResolution =
      await resolveAdminTenant();
  } catch {
    /*
     * Manager recovery must remain usable
     * even when neither PostgreSQL nor the
     * recovery snapshot can be resolved.
     */
  }

  const tenant =
    tenantResolution?.tenant ??
    null;

  /*
   * REC-02
   *
   * Every healthy PostgreSQL-backed Manager
   * request refreshes the tenant diagnostic
   * recovery bundle at most once per minute.
   */
  if (
    tenant &&
    tenantResolution?.resolvedBy ===
      "database"
  ) {
    await refreshAdminRecoveryBundle(
      tenant,
    ).catch(() => {
      /*
       * Recovery persistence is best effort.
       * Never break healthy Admin traffic.
       */
    });
  }

  let site:
    Awaited<
      ReturnType<
        typeof readAdminSiteSettings
      >
    > | null =
    null;

  try {
    site =
      await readAdminSiteSettings();
  } catch {
    /*
     * Live tenant data and REC-02 may both
     * be unavailable. The shell still loads.
     */
  }

  const websiteType:
    WebsiteType =
    normalizeWebsiteType(
      site?.websiteType,
    );

  const planFeatures =
    adminFeaturesFromPlanEntitlements(
      tenant?.entitlements ??
        {},
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
    await resolveDisplayName(
      session.username,
      role,
    );

  const tenantDataUnavailable =
    managerRecovery &&
    tenant === null;

  const tenantRecoverySnapshot =
    managerRecovery &&
    tenant !== null &&
    tenantResolution
      ?.resolvedBy ===
      "snapshot";

  /*
   * Snapshot subscription data is useful
   * diagnostically, but stale billing state
   * must never suspend anything.
   */
  const subscriptionPolicy =
    tenantDataUnavailable ||
    tenantRecoverySnapshot
      ? {
          publicAccess:
            false,
          adminAccess:
            true,
          billingWarning:
            false,
          suspended:
            false,
        }
      : getSubscriptionAccessPolicy(
          tenant
            ?.subscriptionStatus,
        );

  const initialNow =
    Date.now();

  const sessionExpiresAt =
    adminSessionExpiresAt(
      session,
    ) ??
    initialNow;

  return (
    <AdminShell
      websiteType={
        websiteType
      }
      siteName={
        site?.name?.trim() ||
        tenant?.siteName?.trim() ||
        (
          tenantDataUnavailable
            ? "Tenant unavailable"
            : "Staark Hub"
        )
      }
      username={
        displayName
      }
      role={
        role
      }
      features={
        features
      }
      entitlements={
        entitlements
      }
      sessionExpiresAt={
        sessionExpiresAt
      }
      initialNow={
        initialNow
      }
      initialStatus={
        status
      }
      subscriptionStatus={
        tenant
          ?.subscriptionStatus ??
        null
      }
      billingWarning={
        subscriptionPolicy
          .billingWarning
      }
      subscriptionSuspended={
        subscriptionPolicy
          .suspended
      }
      tenantDataUnavailable={
        tenantDataUnavailable
      }
      tenantRecoverySnapshot={
        tenantRecoverySnapshot
      }
      tenantSnapshotUpdatedAt={
        tenantResolution
          ?.snapshotUpdatedAt ??
        null
      }
      development={
        process.env.NODE_ENV !==
        "production"
      }
    >
      {children}
    </AdminShell>
  );
}
