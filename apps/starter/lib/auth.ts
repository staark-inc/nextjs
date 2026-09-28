import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import {
  ADMIN_REMEMBER_TTL_SECONDS,
  isAdminSessionActive,
  resolveAdminAuthConfig,
} from "@staark/platform/server";

export type SessionData = {
  isLoggedIn: boolean;
  username?: string;
  loginAt?: number;
  expiresAt?: number;
  remember?: boolean;
};

export const ADMIN_SESSION_COOKIE = "staark-admin";

/** Shared by route handlers, server components and proxy.ts. */
export function adminSessionOptions(sessionSecret: string): SessionOptions {
  return {
    password: sessionSecret,
    cookieName: ADMIN_SESSION_COOKIE,
    // The encrypted cookie may live for the maximum remembered lifetime.
    // isAdminSessionActive() still enforces the signed 12h/30d absolute expiry.
    ttl: ADMIN_REMEMBER_TTL_SECONDS,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(
    cookieStore,
    adminSessionOptions(resolveAdminAuthConfig().sessionSecret),
  );
}

/** True when the session is logged in and younger than the admin TTL. */
export function isSessionActive(session: Partial<SessionData> | null | undefined): boolean {
  return isAdminSessionActive(session);
}

export function getAdminCredentials(): { username: string; password: string } {
  const { username, password } = resolveAdminAuthConfig();
  return { username, password };
}
