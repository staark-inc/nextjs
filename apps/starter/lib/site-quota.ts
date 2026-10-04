import { resolvePublicContentConfig } from "./content-source";
import { getPrismaClient } from "./db/prisma";
import {
  requireAdminTenantContext,
} from "./admin-tenant";
import {
  PlanLimitError,
  assertWithinPlanLimit,
  entitlementNumber,
} from "./plan-entitlements";
import { listMediaFiles } from "./admin-media";
import type { TenantEntitlements } from "./tenant-context";

export type SiteQuotaResource =
  | "storage"
  | "pages"
  | "users"
  | "domains";

export type SiteQuotaSnapshot = {
  resource: SiteQuotaResource;
  entitlementKey:
    | "storageBytes"
    | "maxPages"
    | "maxUsers"
    | "maxDomains";
  current: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
};

const QUOTA_KEYS: Record<
  SiteQuotaResource,
  SiteQuotaSnapshot["entitlementKey"]
> = {
  storage: "storageBytes",
  pages: "maxPages",
  users: "maxUsers",
  domains: "maxDomains",
};

function quotaSnapshot(
  resource: SiteQuotaResource,
  entitlements: TenantEntitlements,
  current: number,
): SiteQuotaSnapshot {
  const entitlementKey =
    QUOTA_KEYS[resource];

  const limit =
    entitlementNumber(
      entitlements,
      entitlementKey,
    );

  return {
    resource,
    entitlementKey,
    current,
    limit,
    remaining:
      limit === null
        ? null
        : Math.max(
            0,
            limit - current,
          ),
    allowed:
      limit === null ||
      current < limit,
  };
}

async function currentUsage(
  resource: SiteQuotaResource,
  siteId: string,
  organizationId: string | null,
): Promise<number> {
  const prisma =
    getPrismaClient();

  switch (resource) {
    case "pages":
      return prisma.page.count({
        where: {
          siteId,
          deletedAt: null,
        },
      });

    case "domains":
      return prisma.domain.count({
        where: {
          siteId,
          type: "custom",
        },
      });

    case "users":
      if (!organizationId) {
        return 0;
      }

      return prisma.organizationMember.count({
        where: {
          organizationId,
        },
      });

    case "storage": {
      const files =
        await listMediaFiles();

      return files.reduce(
        (total, file) =>
          total +
          Math.max(
            0,
            file.size,
          ),
        0,
      );
    }
  }
}

export async function readAdminSiteQuota(
  resource: SiteQuotaResource,
): Promise<SiteQuotaSnapshot | null> {
  const config =
    resolvePublicContentConfig();

  // Legacy/local installations are not subscription-backed.
  if (config.source !== "postgres") {
    return null;
  }

  const tenant =
    await requireAdminTenantContext();

  const current =
    await currentUsage(
      resource,
      tenant.siteId,
      tenant.organizationId,
    );

  return quotaSnapshot(
    resource,
    tenant.entitlements,
    current,
  );
}

export async function assertAdminSiteQuota(
  resource: SiteQuotaResource,
  additional = 1,
): Promise<SiteQuotaSnapshot | null> {
  const snapshot =
    await readAdminSiteQuota(
      resource,
    );

  if (!snapshot) {
    return null;
  }

  const extra =
    Math.max(
      0,
      additional,
    );

  if (
    snapshot.limit !== null &&
    snapshot.current + extra >
      snapshot.limit
  ) {
    throw new PlanLimitError(
      snapshot.entitlementKey,
      snapshot.limit,
      snapshot.current,
    );
  }

  return snapshot;
}

/**
 * Used when the caller already owns the current count,
 * e.g. inside a DB transaction.
 */
export function assertSiteQuotaValue(
  entitlements: TenantEntitlements,
  resource: SiteQuotaResource,
  current: number,
): void {
  assertWithinPlanLimit(
    entitlements,
    QUOTA_KEYS[resource],
    current,
  );
}

export function siteQuotaLimit(
  entitlements: TenantEntitlements,
  resource: SiteQuotaResource,
): number | null {
  return entitlementNumber(
    entitlements,
    QUOTA_KEYS[resource],
  );
}

export function isPlanLimitError(
  error: unknown,
): error is PlanLimitError {
  return error instanceof PlanLimitError;
}
