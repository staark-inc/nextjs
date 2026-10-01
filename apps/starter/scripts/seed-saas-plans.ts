import { disconnectPrismaClient, getPrismaClient } from "../lib/db/prisma";

const GIB = 1024 * 1024 * 1024;

/**
 * Domain entitlement rule:
 * - every site gets exactly one platform hostname: <site>.staark.app
 * - maxDomains counts CUSTOM domains only
 * - Start: 0 custom, SaaS: 1 custom, Business: 3 custom
 */
const plans = [
  {
    key: "start",
    name: "Start",
    description:
      "Grundläggande webbplats med en inkluderad staark.app-adress.",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    currency: "SEK",
    entitlements: {
      storageBytes: 2 * GIB,
      maxPages: 5,
      // maxDomains counts custom domains only.
      // Every plan also gets one platform hostname: <site>.staark.app.
      maxDomains: 0,
      maxUsers: 1,
      maxForms: 1,
      bookingEnabled: false,
      crmEnabled: false,
    },
  },
  {
    key: "saas",
    name: "SaaS",
    description:
      "Komplett webbplattform med en egen domän och fler funktioner.",
    monthlyPriceCents: 19900,
    yearlyPriceCents: 199000,
    currency: "SEK",
    entitlements: {
      storageBytes: 10 * GIB,
      maxPages: 25,
      // One custom domain, in addition to the included staark.app hostname.
      maxDomains: 1,
      maxUsers: 3,
      maxForms: 25,
      bookingEnabled: true,
      crmEnabled: true,
    },
  },
  {
    key: "business",
    name: "Business",
    description:
      "Avancerad lösning med upp till tre egna domäner och högre kapacitet.",
    monthlyPriceCents: 39900,
    yearlyPriceCents: 399000,
    currency: "SEK",
    entitlements: {
      storageBytes: 50 * GIB,
      maxPages: null,
      // Three custom domains, in addition to the included staark.app hostname.
      maxDomains: 3,
      maxUsers: 10,
      maxForms: null,
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
    `Seeded SaaS plans: ${plans.map((plan) => plan.key).join(", ")}`,
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
