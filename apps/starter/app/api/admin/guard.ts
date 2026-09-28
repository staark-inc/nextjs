import { NextResponse } from "next/server";
import { resolveAdminRole, type AdminRole } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";

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
