import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth";
import { findMatchingRedirect } from "@/lib/admin-redirects";
import { resolveAdminAuthConfig } from "@staark/platform/server";

function isAdminRequest(pathname: string): boolean {
  return pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/");
}

function canRedirectPublicRequest(req: NextRequest): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const { pathname } = req.nextUrl;
  return !(
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/**
 * Public redirects + admin gate.
 *
 * Redirects are file-backed and resolved per request so changes from the local
 * ACP become effective immediately without rebuilding the deployment.
 *
 * Admin configuration is still resolved lazily and only for admin requests.
 * Missing ADMIN_* must never take down public pages.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminRequest = isAdminRequest(pathname);

  if (!adminRequest && canRedirectPublicRequest(req)) {
    try {
      const rule = await findMatchingRedirect(pathname);
      if (rule) {
        const destination = new URL(rule.to, req.url);
        if (!destination.search && req.nextUrl.search) {
          destination.search = req.nextUrl.search;
        }
        return NextResponse.redirect(destination, rule.status);
      }
    } catch (error) {
      // Redirect storage must never make the public site unavailable.
      console.error("[staark] Redirect lookup failed:", (error as Error).message);
    }
  }

  if (!adminRequest) return NextResponse.next();

  // Login page and auth endpoints must stay reachable without a session.
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/")) {
    return NextResponse.next();
  }

  let sessionSecret: string;
  try {
    sessionSecret = resolveAdminAuthConfig().sessionSecret;
  } catch (error) {
    console.error("[staark] Admin is not configured:", (error as Error).message);
    return NextResponse.json(
      { ok: false, error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
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
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/((?!api/|admin/|_next/|uploads/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
