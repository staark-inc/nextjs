import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { adminSessionOptions, type SessionData } from "@/lib/auth";
import { findMatchingRedirect } from "@/lib/admin-redirects";
import {
  canAccessAdminFeature,
  featureForAdminPath,
  resolveAccessibleAdminFeatures,
  resolveAdminEntitlements,
} from "@/lib/admin-features";
import {
  resolveClientFeatures,
} from "@/lib/website-profile";
import { readContentJson } from "@/lib/storage";
import {
  ADMIN_LOGIN_PATH,
  isAdminSessionActive,
  resolveAdminAuthConfig,
  resolveAdminRole,
  safeAdminNext,
} from "@staark/platform/server";

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
 * Redirects are resolved per request from the active Storage v2 source so ACP
 * changes become effective immediately without rebuilding the deployment.
 *
 * Admin configuration is still resolved lazily and only for admin requests.
 * Missing ADMIN_* must never take down public pages.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminRequest = isAdminRequest(pathname);

  if (
    !adminRequest &&
    (req.method === "GET" || req.method === "HEAD") &&
    pathname.startsWith("/uploads/")
  ) {
    const name = pathname.slice("/uploads/".length);
    if (name && !name.includes("/")) {
      const destination = req.nextUrl.clone();
      destination.pathname = `/api/staark/uploads/${encodeURIComponent(name)}`;
      return NextResponse.rewrite(destination);
    }
  }

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

  // Auth endpoints enforce their own checks (config, rate limit, credentials).
  if (pathname.startsWith("/api/admin/auth/")) return NextResponse.next();

  const isLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isApi = pathname.startsWith("/api/admin/");

  let sessionSecret: string;
  try {
    sessionSecret = resolveAdminAuthConfig().sessionSecret;
  } catch (error) {
    // The login page stays reachable so it can explain the problem on submit.
    if (isLoginPage) return NextResponse.next();
    console.error("[staark] Admin is not configured:", (error as Error).message);
    return NextResponse.json(
      { ok: false, error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, adminSessionOptions(sessionSecret));
  const active = isAdminSessionActive(session);

  if (isLoginPage) {
    // Already signed in: skip the form and continue where the user was heading.
    if (active) return NextResponse.redirect(new URL(safeAdminNext(req.nextUrl.searchParams.get("next")), req.url));
    return res;
  }

  if (active) {
    const role = resolveAdminRole(session.role);

    if (role === "client") {
      const managerOnlyThemeRequest =
        pathname.startsWith("/admin/themes/studio") ||
        pathname === "/api/admin/themes" ||
        pathname === "/api/admin/themes/activate" ||
        pathname.startsWith("/api/admin/themes/studio");

      if (managerOnlyThemeRequest) {
        if (isApi) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "This theme operation is available to Staark Manager only.",
            },
            { status: 403 },
          );
        }

        return NextResponse.redirect(
          new URL("/admin/themes", req.url),
        );
      }
    }
    const feature = featureForAdminPath(pathname);
    const entitlements = resolveAdminEntitlements();

    let allowed = feature === null;

    if (!allowed && feature) {
      if (role === "manager") {
        allowed = canAccessAdminFeature(
          role,
          feature,
          entitlements,
        );
      } else {
        let websiteType: unknown;

        try {
          const site = await readContentJson<{ websiteType?: unknown }>(
            "site.json",
          );
          websiteType = site?.websiteType;
        } catch {
          // Fall back to the restrictive generic client profile.
          websiteType = "business";
        }

        const availableFeatures =
          resolveAccessibleAdminFeatures(role);

        const clientFeatures = resolveClientFeatures(
          websiteType,
          availableFeatures,
        );

        allowed = clientFeatures.includes(feature);
      }
    }

    if (allowed) {
      return res;
    }

    if (isApi) {
      return NextResponse.json(
        { ok: false, error: "Not authorized for this admin feature.", feature },
        { status: 403 },
      );
    }

    const dashboard = new URL("/admin", req.url);

    if (feature) {
      dashboard.searchParams.set("denied", feature);
    }

    return NextResponse.redirect(dashboard);
  }

  if (isApi) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const login = new URL(ADMIN_LOGIN_PATH, req.url);
  const next = safeAdminNext(`${pathname}${req.nextUrl.search}`);
  if (next !== "/admin") login.searchParams.set("next", next);
  // A cookie that decrypts but is past its TTL means the session ran out.
  if (session.isLoggedIn) login.searchParams.set("reason", "expired");
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/uploads/:path*",
    "/((?!api/|admin/|_next/|uploads/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
