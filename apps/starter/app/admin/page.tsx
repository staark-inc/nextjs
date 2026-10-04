import {
  resolveAdminRole,
} from "@staark/platform/server";
import { getSession } from "@/lib/auth";
import {
  loadDashboard,
} from "@/lib/admin-dashboard";
import {
  loadManagerDashboard,
} from "@/lib/admin-manager-dashboard";
import {
  resolveAccessibleAdminFeatures,
} from "@/lib/admin-features";
import {
  resolveClientFeatures,
} from "@/lib/website-profile";
import ClientDashboard from "./ClientDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { getPrismaClient } from "@/lib/db/prisma";
import { resolveAdminTenantContext } from "@/lib/admin-tenant";
import { adminFeaturesFromPlanEntitlements } from "@/lib/plan-entitlements";
import { readAdminAnnouncements } from "@/lib/hub-announcements";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();

  const role = resolveAdminRole(
    session.role,
  );

  // ----------------------------------------------------------
  // STAARK MANAGER
  // Completely technical dashboard.
  // It does not call loadDashboard(), so it does not load
  // customer messages or booking tasks.
  // ----------------------------------------------------------

  if (role === "manager") {
    const data =
      await loadManagerDashboard();

    return (
      <ManagerDashboard
        data={data}
        username={
          session.username ??
          "manager"
        }
      />
    );
  }

  // ----------------------------------------------------------
  // CLIENT
  // Business-oriented dashboard.
  // ----------------------------------------------------------

  const data =
    await loadDashboard();

  const tenantUpdates =
    await readAdminAnnouncements(
      3,
    );

  const websiteType =
    data.websiteType;

  const tenant =
    await resolveAdminTenantContext();

  const planFeatures =
    adminFeaturesFromPlanEntitlements(
      tenant?.entitlements ?? {},
    );

  const availableFeatures =
    resolveAccessibleAdminFeatures(
      role,
      process.env,
      planFeatures,
    );

  const clientFeatures = [
    ...resolveClientFeatures(
      websiteType,
      availableFeatures,
    ),
  ];

  let displayName =
    session.username ??
    "client";

  if (displayName.includes("@")) {
    const user = await getPrismaClient().user.findUnique({
      where: {
        email: displayName.toLowerCase(),
      },
      select: {
        name: true,
      },
    });

    displayName =
      user?.name?.trim() ||
      displayName;
  }

  return (
    <ClientDashboard
      data={data}
      username={displayName}
      websiteType={websiteType}
      bookingEnabled={
        clientFeatures.includes(
          "booking",
        )
      }
      updates={tenantUpdates.items}
    />
  );
}
