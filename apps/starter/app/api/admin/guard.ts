import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return null;
}
