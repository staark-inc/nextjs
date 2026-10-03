import { getPrismaClient } from "@/lib/db/prisma";
import { hasPublicSubscriptionAccess } from "./subscription-access";

export type TenantEntitlements = {
  storageBytes?: number;
  maxPages?: number | null;
  maxDomains?: number | null;
  maxUsers?: number | null;
  maxForms?: number | null;
  bookingEnabled?: boolean;
  crmEnabled?: boolean;
  [key: string]: unknown;
};

export type TenantContext = {
  hostname: string;
  source: "domain" | "site-key-fallback";
  siteId: string;
  siteKey: string;
  siteName: string;
  organizationId: string | null;
  organizationName: string | null;
  domainId: string | null;
  planKey: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  publicAccess: boolean;
  entitlements: TenantEntitlements;
};

import {
  normalizeHostname,
  resolveRequestHostname,
  type TenantRequestInput,
} from "./tenant-host";

export { normalizeHostname, resolveRequestHostname };
export type { TenantRequestInput };

function asEntitlements(value: unknown): TenantEntitlements {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as TenantEntitlements;
}

function normalizeSiteKey(value: string | undefined): string {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key) return "";
  if (!/^[a-z0-9][a-z0-9-_]{0,99}$/.test(key)) {
    throw new Error(
      "STAARK_SITE_KEY must be 1-100 lowercase letters, numbers, dashes or underscores.",
    );
  }
  return key;
}

type SiteWithTenantRelations = {
  id: string;
  key: string;
  name: string;
  organizationId: string | null;
  organization: { id: string; name: string } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    plan: {
      key: string;
      entitlements: unknown;
    };
  }>;
};

function contextFromSite(
  site: SiteWithTenantRelations,
  options: {
    hostname: string;
    source: TenantContext["source"];
    domainId?: string | null;
  },
): TenantContext {
  const subscription = site.subscriptions[0] ?? null;

  return {
    hostname: options.hostname,
    source: options.source,
    siteId: site.id,
    siteKey: site.key,
    siteName: site.name,
    organizationId: site.organization?.id ?? site.organizationId ?? null,
    organizationName: site.organization?.name ?? null,
    domainId: options.domainId ?? null,
    planKey: subscription?.plan.key ?? null,
    subscriptionId: subscription?.id ?? null,
    subscriptionStatus: subscription?.status ?? null,
    publicAccess:
      hasPublicSubscriptionAccess(
        subscription?.status,
      ),
    entitlements: asEntitlements(subscription?.plan.entitlements),
  };
}

const siteTenantInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  subscriptions: {
    include: {
      plan: {
        select: {
          key: true,
          entitlements: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc" as const,
    },
    take: 1,
  },
};

/**
 * Resolve a tenant from a public hostname.
 *
 * Production path:
 *   Host -> domains.hostname -> Site -> Organization -> Subscription -> Plan
 *
 * Dev compatibility path:
 *   no matching Domain -> STAARK_SITE_KEY
 *
 * `STAARK_SITE_KEY` remains a compatibility fallback while hostname routing is
 * rolled out. Set STAARK_TENANT_SITE_KEY_FALLBACK=0 to force domain-only mode.
 */
export async function resolveTenantContext(
  input: TenantRequestInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<TenantContext | null> {
  const hostname = resolveRequestHostname(input, env);
  const prisma = getPrismaClient();

  if (hostname) {
    const domain = await prisma.domain.findUnique({
      where: { hostname },
      select: {
        id: true,
        site: {
          include: siteTenantInclude,
        },
      },
    });

    if (domain) {
      return contextFromSite(domain.site, {
        hostname,
        source: "domain",
        domainId: domain.id,
      });
    }
  }

  if (env.STAARK_TENANT_SITE_KEY_FALLBACK === "0") return null;

  const siteKey = normalizeSiteKey(env.STAARK_SITE_KEY);
  if (!siteKey) return null;

  const site = await prisma.site.findUnique({
    where: { key: siteKey },
    include: siteTenantInclude,
  });

  if (!site) return null;

  return contextFromSite(site, {
    hostname,
    source: "site-key-fallback",
  });
}
