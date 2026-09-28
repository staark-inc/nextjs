import { NextResponse } from "next/server";
import { resolveAdminRole } from "@staark/platform/server";
import { adminSessionExpiresAt } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const active = isSessionActive(session);
  return NextResponse.json({
    isLoggedIn: active,
    username: active ? session.username ?? null : null,
    role: active ? resolveAdminRole(session.role) : null,
    expiresAt: active ? adminSessionExpiresAt(session) : null,
    remember: active ? session.remember === true : false,
  });
}
