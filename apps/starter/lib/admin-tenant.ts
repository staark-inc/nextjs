import { headers } from "next/headers";

import { resolvePublicContentConfig } from "./content-source";
import {
  resolveTenantContext,
  type TenantContext,
} from "./tenant-context";

/**
 * Resolve the PostgreSQL tenant for the current Admin request.
 *
 * SaaS requests are hostname-first. The legacy STAARK_SITE_KEY path remains
 * available only through resolveTenantContext's explicitly enabled fallback,
 * which keeps CLI / dedicated-client deployments compatible.
 */
export async function resolveAdminTenantContext(): Promise<TenantContext | null> {
  const config = resolvePublicContentConfig();
  if (config.source !== "postgres") return null;

  try {
    const requestHeaders = await headers();
    const tenant = await resolveTenantContext({
      host: requestHeaders.get("host"),
      forwardedHost: requestHeaders.get("x-forwarded-host"),
    });
    if (tenant) return tenant;
  } catch {
    // next/headers is unavailable in some CLI/test contexts. The explicit
    // compatibility fallback below is still governed by tenant-context.
  }

  return resolveTenantContext({
    host: null,
    forwardedHost: null,
  });
}

export async function requireAdminTenantContext(): Promise<TenantContext> {
  const tenant = await resolveAdminTenantContext();
  if (!tenant) {
    throw new Error(
      "PostgreSQL Admin requires a resolved tenant hostname (or an explicitly enabled site-key fallback).",
    );
  }
  return tenant;
}

export async function requireAdminSiteKey(): Promise<string> {
  return (await requireAdminTenantContext()).siteKey;
}

export async function requireAdminSiteId(): Promise<string> {
  return (await requireAdminTenantContext()).siteId;
}
