import {
  headers,
} from "next/headers";

import {
  resolvePublicContentConfig,
} from "./content-source";

import {
  resolveRequestHostname,
  resolveTenantContext,
  type TenantContext,
} from "./tenant-context";

import {
  readAdminTenantSnapshot,
  rememberAdminTenantSnapshot,
} from "./admin-tenant-snapshot";

export type AdminTenantResolution = {
  tenant: TenantContext | null;

  resolvedBy:
    | "database"
    | "snapshot"
    | "legacy";

  snapshotUpdatedAt:
    string | null;
};

async function requestTenantHost(): Promise<{
  host: string | null;
  forwardedHost: string | null;
  hostname: string | null;
}> {
  try {
    const requestHeaders =
      await headers();

    const host =
      requestHeaders.get(
        "host",
      );

    const forwardedHost =
      requestHeaders.get(
        "x-forwarded-host",
      );

    const hostname =
      resolveRequestHostname({
        host,
        forwardedHost,
      }) || null;

    return {
      host,
      forwardedHost,
      hostname,
    };
  } catch {
    return {
      host: null,
      forwardedHost: null,
      hostname: null,
    };
  }
}

export async function resolveAdminTenant():
Promise<AdminTenantResolution> {
  const config =
    resolvePublicContentConfig();

  if (
    config.source !==
    "postgres"
  ) {
    return {
      tenant: null,
      resolvedBy:
        "legacy",
      snapshotUpdatedAt:
        null,
    };
  }

  const request =
    await requestTenantHost();

  /*
   * Healthy path:
   *
   * Host -> PostgreSQL -> tenant
   *                  -> refresh recovery snapshot
   */
  try {
    const tenant =
      await resolveTenantContext({
        host:
          request.host,
        forwardedHost:
          request.forwardedHost,
      });

    if (tenant) {
      await rememberAdminTenantSnapshot(
        tenant,
        [
          request.hostname,
          request.host,
          request.forwardedHost,
        ],
      );

      return {
        tenant,
        resolvedBy:
          "database",
        snapshotUpdatedAt:
          null,
      };
    }
  } catch {
    /*
     * PostgreSQL may be unavailable.
     * Continue into persistent recovery data.
     */
  }

  /*
   * Recovery path:
   *
   * Host -> persistent storage snapshot
   *
   * No Prisma call is made here.
   */
  const recovered =
    await readAdminTenantSnapshot(
      request.hostname,
    );

  if (recovered) {
    return {
      tenant:
        recovered.tenant,

      resolvedBy:
        "snapshot",

      snapshotUpdatedAt:
        recovered.updatedAt,
    };
  }

  return {
    tenant: null,
    resolvedBy:
      "snapshot",
    snapshotUpdatedAt:
      null,
  };
}

/**
 * Compatibility API used throughout Admin.
 *
 * Callers do not need to know whether the
 * tenant came from PostgreSQL or the recovery
 * snapshot.
 */
export async function resolveAdminTenantContext():
Promise<TenantContext | null> {
  return (
    await resolveAdminTenant()
  ).tenant;
}

export async function requireAdminTenantContext():
Promise<TenantContext> {
  const result =
    await resolveAdminTenant();

  if (!result.tenant) {
    throw new Error(
      "PostgreSQL Admin requires a resolved tenant hostname and no recovery tenant snapshot is available.",
    );
  }

  return result.tenant;
}

export async function requireAdminSiteKey():
Promise<string> {
  return (
    await requireAdminTenantContext()
  ).siteKey;
}

export async function requireAdminSiteId():
Promise<string> {
  return (
    await requireAdminTenantContext()
  ).siteId;
}
