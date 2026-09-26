import { NextRequest, NextResponse } from "next/server";
import { getSession, getAdminCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };

  const creds = getAdminCredentials();

  if (!username || !password || username !== creds.username || password !== creds.password) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.username = username;
  session.loginAt = Date.now();
  await session.save();

  return NextResponse.json({ ok: true });
}
