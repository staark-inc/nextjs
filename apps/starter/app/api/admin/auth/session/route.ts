import { NextResponse } from "next/server";
import { ADMIN_SESSION_TTL_SECONDS } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const active = isSessionActive(session);
  return NextResponse.json({
    isLoggedIn: active,
    expiresAt: active && session.loginAt ? session.loginAt + ADMIN_SESSION_TTL_SECONDS * 1000 : null,
  });
}
