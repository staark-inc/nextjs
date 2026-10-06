import type { Metadata } from "next";
import "./editor.css";
export const metadata: Metadata = { title: "Custom workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
