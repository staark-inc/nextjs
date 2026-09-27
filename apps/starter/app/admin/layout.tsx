import type { Metadata } from "next";
import { ADMIN_SESSION_TTL_SECONDS } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";
import { peekAdminShellStatus } from "@/lib/admin-shell-status";
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

  const status = await peekAdminShellStatus();
  const sessionExpiresAt = (session.loginAt ?? Date.now()) + ADMIN_SESSION_TTL_SECONDS * 1000;

  return (
    <AdminShell
      username={session.username ?? "Admin"}
      sessionExpiresAt={sessionExpiresAt}
      initialStatus={status}
      development={process.env.NODE_ENV !== "production"}
    >
      {children}
    </AdminShell>
  );
}
