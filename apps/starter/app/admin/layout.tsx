import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import AdminShell from "./AdminShell";
import "./admin.css";
import "./admin-v2.css";
import "./overview-control-center.css";
import "./admin-v3.css";

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

  if (!session.isLoggedIn) return children;

  return <AdminShell username={session.username ?? "Admin"}>{children}</AdminShell>;
}
