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
import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import { resolvePublicContentConfig } from "@/lib/content-source";
import { resolveTenantContext } from "@/lib/tenant-context";
import { adminFeaturesFromPlanEntitlements } from "@/lib/plan-entitlements";
import {
  validateClientSessionIdentity,
  validateManagerSessionScope,
} from "@/lib/session-identity";
import {
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth";
import {
  ADMIN_LOGIN_PATH,
  isAdminSessionActive,
  resolveAdminAuthConfig,
  resolveAdminRole,
  safeAdminNext,
} from "@staark/platform/server";


const STAARK_ORIGIN_HOST =
  process.env.STAARK_ORIGIN_HOST?.trim().toLowerCase() ||
  "origin.staark.app";

function normalizeRequestHost(value: string | null): string | null {
  if (!value) return null;

  const first = value.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;

  // Host headers may include a port. IPv6 literals are not expected for
  // public tenant hostnames, so the simple hostname:port form is sufficient.
  return first.replace(/:\d+$/, "").replace(/\.$/, "");
}

function requestHostname(req: NextRequest): string | null {
  return normalizeRequestHost(
    req.headers.get("x-forwarded-host") ??
      req.headers.get("host"),
  );
}

function isStaarkOriginHealthRequest(
  req: NextRequest,
  pathname: string,
): boolean {
  if (requestHostname(req) !== STAARK_ORIGIN_HOST) return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  // Keep the infrastructure origin deliberately tiny: it exists only so
  // Cloudflare can validate/reach the fallback origin. Tenant traffic keeps
  // the customer's original Host header and therefore never matches this.
  return pathname === "/" || pathname === "/_staark/health";
}

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

function isMissingConfiguredPostgresSite(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith(
      'No PostgreSQL Site exists for STAARK_SITE_KEY="',
    )
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

  if (isStaarkOriginHealthRequest(req, pathname)) {
    return new NextResponse(
      req.method === "HEAD" ? null : "Staark SaaS origin healthy\n",
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "text/plain; charset=utf-8",
          "x-staark-origin": "healthy",
        },
      },
    );
  }

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
      if (isMissingConfiguredPostgresSite(error)) {
        return NextResponse.redirect(new URL("/admin/setup", req.url));
      }

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
    const role =
      resolveAdminRole(
        session.role,
      );

    const contentConfig =
      resolvePublicContentConfig();

    const tenant =
      contentConfig.source ===
        "postgres"
        ? await resolveTenantContext({
            host:
              req.headers.get(
                "host",
              ),
            forwardedHost:
              req.headers.get(
                "x-forwarded-host",
              ),
          })
        : null;

    const identityValidation =
      role === "manager"
        ? validateManagerSessionScope(
            session,
          )
        : await validateClientSessionIdentity(
            session,
            tenant,
          );

    if (
      !identityValidation.ok
    ) {
      const response =
        isApi
          ? NextResponse.json(
              {
                ok: false,
                code:
                  "SESSION_IDENTITY_INVALID",
                reason:
                  identityValidation.reason,
                error:
                  "Your session is no longer valid. Sign in again.",
              },
              {
                status: 401,
              },
            )
          : NextResponse.redirect(
              new URL(
                `${ADMIN_LOGIN_PATH}?reason=revoked`,
                req.url,
              ),
            );

      response.cookies.delete(
        ADMIN_SESSION_COOKIE,
      );

      return response;
    }

    const setupRequest =
      pathname === "/admin/setup" ||
      pathname === "/api/admin/setup";

    if (setupRequest && role !== "manager") {
      if (isApi) {
        return NextResponse.json(
          { ok: false, error: "First configuration requires a manager session." },
          { status: 403 },
        );
      }

      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (!setupRequest) {
      try {
        await readAdminSiteSettings();
      } catch (error) {
        if (isMissingConfiguredPostgresSite(error)) {
          if (isApi) {
            return NextResponse.json(
              { ok: false, setupRequired: true },
              { status: 409 },
            );
          }

          return NextResponse.redirect(new URL("/admin/setup", req.url));
        }

        throw error;
      }
    }

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

    const planFeatures =
      adminFeaturesFromPlanEntitlements(
        tenant?.entitlements ?? {},
      );

    const entitlements =
      resolveAdminEntitlements(
        process.env,
        planFeatures,
      );

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
          const site =
            await readAdminSiteSettings();

          websiteType =
            site.websiteType;
        } catch {
          // Fall back to the restrictive generic client profile.
          websiteType = "business";
        }

        const availableFeatures =
          resolveAccessibleAdminFeatures(
            role,
            process.env,
            planFeatures,
          );

        const clientFeatures =
          resolveClientFeatures(
            websiteType,
            availableFeatures,
          );

        allowed =
          clientFeatures.includes(feature);
      }
    }

    if (allowed) {
      return res;
    }

    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          code:
            role === "client"
              ? "PLAN_FEATURE_REQUIRED"
              : "ADMIN_FEATURE_FORBIDDEN",
          error:
            role === "client"
              ? "This feature is not included in the current package."
              : "Not authorized for this admin feature.",
          feature,
          upgradeUrl:
            role === "client"
              ? "/admin/plan"
              : null,
        },
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
