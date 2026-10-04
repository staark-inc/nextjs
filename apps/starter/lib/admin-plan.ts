import { getPrismaClient } from "./db/prisma";
import { requireAdminTenantContext } from "./admin-tenant";
import { resolvePublicContentConfig } from "./content-source";
import { listMediaFiles } from "./admin-media";
import {
  INCLUDED_PAGE_PATHS,
  billableUsersCount,
} from "./site-quota";

export type AdminPlanSummary = {
  planKey: string;
  planName: string;
  description: string | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  currency: string;
  billingInterval: string;
  subscriptionStatus: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  storageUsedBytes: number;
  mediaCount: number;
  pagesCount: number;
  submissionsCount: number;
  usersCount: number;
  domainsCount: number;
  entitlements: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function readAdminPlanSummary(): Promise<AdminPlanSummary> {
  const contentConfig = resolvePublicContentConfig();

  // Local/legacy development has no SaaS tenant/subscription database.
  // Keep the Plan page renderable so UI work does not require PostgreSQL.
  if (contentConfig.source !== "postgres") {
    return {
      planKey: "local",
      planName: "Local development",
      description:
        "Local legacy mode. SaaS billing and live usage require PostgreSQL.",
      monthlyPriceCents: null,
      yearlyPriceCents: null,
      currency: "SEK",
      billingInterval: "monthly",
      subscriptionStatus: "development",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      storageUsedBytes: 0,
      mediaCount: 0,
      pagesCount: 0,
      submissionsCount: 0,
      usersCount: 0,
      domainsCount: 0,
      entitlements: {},
    };
  }

  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const [
    subscription,
    pagesCount,
    submissionsCount,
    usersCount,
    domainsCount,
    mediaFiles,
  ] = await Promise.all([
    prisma.subscription.findUnique({
      where: { siteId: tenant.siteId },
      include: { plan: true },
    }),
    prisma.page.count({
      where: {
        siteId: tenant.siteId,
        deletedAt: null,
        path: {
          notIn: [
            ...INCLUDED_PAGE_PATHS,
          ],
        },
      },
    }),
    prisma.submission.count({
      where: {
        siteId: tenant.siteId,
      },
    }),
    tenant.organizationId
      ? prisma.organizationMember
          .count({
            where: {
              organizationId:
                tenant.organizationId,
            },
          })
          .then(
            billableUsersCount,
          )
      : Promise.resolve(0),
    prisma.domain.count({
      where: {
        siteId: tenant.siteId,
        type: "custom",
      },
    }),
    listMediaFiles(
      tenant.siteId,
    ),
  ]);

  if (!subscription) {
    throw new Error("The current tenant does not have an attached subscription.");
  }

  const liveMediaBytes = mediaFiles.reduce(
    (total, file) => total + Math.max(0, file.size),
    0,
  );

  return {
    planKey: subscription.plan.key,
    planName: subscription.plan.name,
    description: subscription.plan.description,
    monthlyPriceCents: subscription.plan.monthlyPriceCents,
    yearlyPriceCents: subscription.plan.yearlyPriceCents,
    currency: subscription.plan.currency,
    billingInterval: subscription.billingInterval,
    subscriptionStatus: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    // Customer-facing usage is the actual tenant storage, never a stale
    // accounting counter left behind after deletes or recovery work.
    storageUsedBytes:
      liveMediaBytes,
    mediaCount: mediaFiles.length,
    pagesCount,
    submissionsCount,
    usersCount,
    domainsCount,
    entitlements: asRecord(subscription.plan.entitlements),
  };
}
