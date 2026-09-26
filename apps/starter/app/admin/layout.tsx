import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import AdminShell from "./AdminShell";
import "./admin.css";
import "./admin-v2.css";
import "./overview-control-center.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staark Admin", robots: "noindex" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session.isLoggedIn) return children;

  return <AdminShell username={session.username ?? "Admin"}>{children}</AdminShell>;
}
