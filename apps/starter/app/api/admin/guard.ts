import { NextResponse } from "next/server";
import { getSession, isSessionActive } from "@/lib/auth";

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!isSessionActive(session)) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return null;
}
