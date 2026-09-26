import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { resolveAdminAuthConfig } from "@staark/platform/server";

export type SessionData = {
  isLoggedIn: boolean;
  username?: string;
  loginAt?: number;
};

function sessionOptions(): SessionOptions {
  const config = resolveAdminAuthConfig();
  return {
    password: config.sessionSecret,
    cookieName: "staark-admin",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}

export function getAdminCredentials(): { username: string; password: string } {
  const { username, password } = resolveAdminAuthConfig();
  return { username, password };
}
