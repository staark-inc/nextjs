import type { Metadata } from "next";
import type { WebsiteType } from "@staark/core";
import { adminSessionExpiresAt } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";
import { normalizeWebsiteType } from "@/lib/website-profile";
import { peekAdminShellStatus } from "@/lib/admin-shell-status";
import { readContentJson } from "@/lib/storage";
import AdminShell from "./AdminShell";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staark Hub · NextJS Platform", robots: "noindex" };

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

  let websiteType: WebsiteType = "business";
  try {
    const site = await readContentJson<{ websiteType?: unknown }>("site.json");
    websiteType = normalizeWebsiteType(site?.websiteType);
  } catch {
    // Admin remains usable if content storage is temporarily unavailable.
  }


  const [status, site] = await Promise.all([
    peekAdminShellStatus(),
    readContentJson<{ name?: string }>("site.json").catch(() => null),
  ]);
  const sessionExpiresAt = adminSessionExpiresAt(session) ?? Date.now();

  return (
    <AdminShell
      websiteType={websiteType}
      siteName={site?.name?.trim() || "Staark Hub"}
      username={session.username ?? "Admin"}
      sessionExpiresAt={sessionExpiresAt}
      initialStatus={status}
      development={process.env.NODE_ENV !== "production"}
    >
      {children}
    </AdminShell>
  );
}
