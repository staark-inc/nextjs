import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth";
import { resolveAdminAuthConfig } from "@staark/platform/server";

/**
 * Admin gate.
 *
 * The admin configuration is resolved lazily INSIDE the handler, never at module
 * scope. `resolveAdminAuthConfig()` throws in production when ADMIN_* is missing;
 * if that ran at import time it would crash middleware instantiation and take the
 * whole site — including public pages — down with a 500. Resolving it here means a
 * missing/invalid admin config only affects /admin, and the matcher keeps this
 * handler off public routes entirely.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login page and auth endpoints must stay reachable without a session.
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/")) {
    return NextResponse.next();
  }

  let sessionSecret: string;
  try {
    sessionSecret = resolveAdminAuthConfig().sessionSecret;
  } catch (error) {
    // Admin isn't configured (e.g. missing ADMIN_* in production). Fail this
    // request clearly instead of crashing the app for every visitor.
    console.error("[staark] Admin is not configured:", (error as Error).message);
    return NextResponse.json({ ok: false, error: "Admin is not configured on this deployment." }, { status: 503 });
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, {
    password: sessionSecret,
    cookieName: "staark-admin",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
    },
  });

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
