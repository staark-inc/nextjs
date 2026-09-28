import { NextResponse } from "next/server";
import { adminSessionExpiresAt } from "@staark/platform/server";
import { getSession, isSessionActive } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const active = isSessionActive(session);
  return NextResponse.json({
    isLoggedIn: active,
    expiresAt: active ? adminSessionExpiresAt(session) : null,
    remember: active ? session.remember === true : false,
  });
}
