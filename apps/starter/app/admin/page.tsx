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
  readContentJson,
} from "@/lib/storage";
import {
  normalizeWebsiteType,
  resolveClientFeatures,
} from "@/lib/website-profile";
import ClientDashboard from "./ClientDashboard";
import ManagerDashboard from "./ManagerDashboard";

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

  const [data, site] =
    await Promise.all([
      loadDashboard(),

      readContentJson<{
        websiteType?: unknown;
      }>("site.json").catch(
        () => null,
      ),
    ]);

  const websiteType =
    normalizeWebsiteType(
      site?.websiteType,
    );

  const availableFeatures =
    resolveAccessibleAdminFeatures(
      role,
    );

  const clientFeatures = [
    ...resolveClientFeatures(
      websiteType,
      availableFeatures,
    ),
  ];

  return (
    <ClientDashboard
      data={data}
      username={
        session.username ??
        "client"
      }
      websiteType={websiteType}
      bookingEnabled={
        clientFeatures.includes(
          "booking",
        )
      }
    />
  );
}
