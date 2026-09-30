import { getPrismaClient } from "./db/prisma";
import { requireAdminTenantContext } from "./admin-tenant";

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
  entitlements: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function bigintToSafeNumber(value: bigint): number {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  return Number(value > max ? max : value);
}

export async function readAdminPlanSummary(): Promise<AdminPlanSummary> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const [subscription, usage] = await Promise.all([
    prisma.subscription.findUnique({
      where: { siteId: tenant.siteId },
      include: { plan: true },
    }),
    prisma.siteUsage.findUnique({
      where: { siteId: tenant.siteId },
    }),
  ]);

  if (!subscription) {
    throw new Error("The current tenant does not have an attached subscription.");
  }

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
    storageUsedBytes: usage ? bigintToSafeNumber(usage.storageBytes) : 0,
    mediaCount: usage?.mediaCount ?? 0,
    pagesCount: usage?.pagesCount ?? 0,
    submissionsCount: usage?.submissionsCount ?? 0,
    entitlements: asRecord(subscription.plan.entitlements),
  };
}
