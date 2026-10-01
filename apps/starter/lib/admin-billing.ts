import { getPrismaClient } from "./db/prisma";
import { requireAdminTenantContext } from "./admin-tenant";
import {
  createStripePortalSession,
  stripeBillingConfigured,
  stripeCustomerId,
  stripeSubscriptionInterval,
  stripeSubscriptionPeriod,
  stripeSubscriptionPriceId,
  stripeUnixDate,
  type StripeSubscriptionPayload,
  type StripeWebhookEvent,
} from "./stripe-billing";

export type AdminBillingStatus = {
  configured: boolean;
  customerAttached: boolean;
  subscriptionAttached: boolean;
};

export async function readAdminBillingStatus(): Promise<AdminBillingStatus> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const subscription = await prisma.subscription.findUnique({
    where: { siteId: tenant.siteId },
    select: {
      providerCustomerId: true,
      providerSubscriptionId: true,
    },
  });

  return {
    configured: stripeBillingConfigured(),
    customerAttached: Boolean(subscription?.providerCustomerId),
    subscriptionAttached: Boolean(subscription?.providerSubscriptionId),
  };
}

export async function createAdminBillingPortalSession(
  returnUrl: string,
): Promise<{ url: string }> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const subscription = await prisma.subscription.findUnique({
    where: { siteId: tenant.siteId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new Error("The current tenant does not have an attached subscription.");
  }

  const customerId = subscription.providerCustomerId;

  if (!customerId) {
    throw new Error(
      "Billing customer has not been synchronized from Staark Hub yet.",
    );
  }

  const session = await createStripePortalSession({
    customerId,
    returnUrl,
  });

  return { url: session.url };
}

async function planForStripePrice(priceId: string | null) {
  if (!priceId) return null;
  const prisma = getPrismaClient();

  return prisma.plan.findFirst({
    where: {
      OR: [
        { stripePriceMonthlyId: priceId },
        { stripePriceYearlyId: priceId },
      ],
    },
    select: { id: true },
  });
}

export async function processStripeSubscriptionEvent(
  event: StripeWebhookEvent,
): Promise<void> {
  const object = event.data.object as StripeSubscriptionPayload;
  if (!object?.id || !object.id.startsWith("sub_")) {
    return;
  }

  const prisma = getPrismaClient();

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { providerSubscriptionId: object.id },
        ...(stripeCustomerId(object.customer)
          ? [{ providerCustomerId: stripeCustomerId(object.customer)! }]
          : []),
      ],
    },
  });

  const eventRow = await prisma.billingEvent.upsert({
    where: { providerEventId: event.id },
    create: {
      provider: "stripe",
      providerEventId: event.id,
      type: event.type,
      payload: event as never,
      organizationId: existing?.organizationId ?? null,
      subscriptionId: existing?.id ?? null,
      processed: false,
    },
    update: {},
  });

  if (eventRow.processed) {
    return;
  }

  if (!existing) {
    await prisma.billingEvent.update({
      where: { id: eventRow.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
    return;
  }

  const priceId = stripeSubscriptionPriceId(object);
  const mappedPlan = await planForStripePrice(priceId);
  const period = stripeSubscriptionPeriod(object);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: existing.id },
      data: {
        provider: "stripe",
        providerCustomerId:
          stripeCustomerId(object.customer) ?? existing.providerCustomerId,
        providerSubscriptionId: object.id,
        status: object.status || existing.status,
        billingInterval: stripeSubscriptionInterval(object),
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
        canceledAt: stripeUnixDate(object.canceled_at),
        trialEndsAt: stripeUnixDate(object.trial_end),
        ...(mappedPlan ? { planId: mappedPlan.id } : {}),
      },
    }),
    prisma.billingEvent.update({
      where: { id: eventRow.id },
      data: {
        organizationId: existing.organizationId,
        subscriptionId: existing.id,
        processed: true,
        processedAt: new Date(),
      },
    }),
  ]);
}
