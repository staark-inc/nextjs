import { disconnectPrismaClient, getPrismaClient } from "../lib/db/prisma";

const GIB = 1024 * 1024 * 1024;

/**
 * Runtime mirror of the canonical Staark Hub plan catalog.
 *
 * Billing/Stripe remains owned by staark-inc/web.
 * This table exists so the Next runtime can enforce local usage/features and
 * render the customer's Plan & usage area.
 *
 * Canonical commercial plans:
 * - Starter:  199 SEK/month, 1 990 SEK/year
 * - Growth:   399 SEK/month, 3 990 SEK/year
 * - Business: 899 SEK/month, 8 990 SEK/year
 *
 * `start` is intentionally kept as the runtime key for backward compatibility.
 * Hub plan codes map as:
 *   STARTER  -> start
 *   SAAS     -> saas
 *   BUSINESS -> business
 */
const plans = [
  {
    key: "start",
    name: "Starter",
    description: "Website care for one production website.",
    monthlyPriceCents: 19900,
    yearlyPriceCents: 199000,
    currency: "SEK",
    entitlements: {
      websiteMax: 1,
      customDomain: true,

      storageBytes: 10 * GIB,
      maxPages: 5,
      maxDomains: 1,
      maxUsers: 1,
      maxForms: 1,

      backupRetentionDays: 7,
      security: "core",
      performance: "core",
      seo: "basic",
      searchConsole: "overview",
      analytics: "overview",
      businessProfile: false,
      leadsEnabled: false,
      reports: "basic",
      automations: "none",
      clientManagementEnabled: false,
      teamEnabled: false,
      support: "standard",

      // Next-runtime capability.
      bookingEnabled: false,
      crmEnabled: false,
    },
  },
  {
    key: "saas",
    name: "Growth",
    description: "Growth tooling and integrations for one production website.",
    monthlyPriceCents: 39900,
    yearlyPriceCents: 399000,
    currency: "SEK",
    entitlements: {
      websiteMax: 1,
      customDomain: true,

      storageBytes: 30 * GIB,
      maxPages: 25,
      maxDomains: 1,
      maxUsers: 1,
      maxForms: 25,

      backupRetentionDays: 14,
      security: "full",
      performance: "full",
      seo: "full",
      searchConsole: "full",
      analytics: "full",
      businessProfile: true,
      leadsEnabled: true,
      reports: "full",
      automations: "standard",
      clientManagementEnabled: false,
      teamEnabled: false,
      support: "standard",

      // Vertical/runtime capability already supported by Staark Next.
      bookingEnabled: true,
      crmEnabled: false,
    },
  },
  {
    key: "business",
    name: "Business",
    description: "Operations, CRM and advanced reporting for one production website.",
    monthlyPriceCents: 89900,
    yearlyPriceCents: 899000,
    currency: "SEK",
    entitlements: {
      websiteMax: 1,
      customDomain: true,

      storageBytes: 60 * GIB,
      maxPages: null,
      maxDomains: 1,
      maxUsers: 10,
      maxForms: null,

      backupRetentionDays: 30,
      security: "full",
      performance: "full",
      seo: "full",
      searchConsole: "full",
      analytics: "advanced",
      businessProfile: true,
      leadsEnabled: true,
      reports: "advanced",
      automations: "advanced",
      clientManagementEnabled: true,
      teamEnabled: true,
      support: "priority",

      bookingEnabled: true,
      crmEnabled: true,
    },
  },
] as const;

async function main() {
  const prisma = getPrismaClient();

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      create: {
        ...plan,
        entitlements: { ...plan.entitlements },
      },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        currency: plan.currency,
        entitlements: { ...plan.entitlements },
        active: true,
      },
    });
  }

  console.log(
    `Seeded SaaS plan mirror: ${plans.map((plan) => plan.key).join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
