import { disconnectPrismaClient, getPrismaClient } from "../lib/db/prisma";

const GIB = 1024 * 1024 * 1024;

const plans = [
  {
    key: "start",
    name: "Start",
    description: "Grundläggande webbplats för mindre företag.",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    currency: "SEK",
    entitlements: {
      storageBytes: 2 * GIB,
      maxPages: 5,
      maxDomains: 1,
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
      "Komplett webbplattform med fler funktioner och automatisering.",
    monthlyPriceCents: 19900,
    yearlyPriceCents: 199000,
    currency: "SEK",
    entitlements: {
      storageBytes: 10 * GIB,
      maxPages: 25,
      maxDomains: 3,
      maxUsers: 3,
      maxForms: 25,
      bookingEnabled: true,
      crmEnabled: true,
    },
  },
  {
    key: "business",
    name: "Business",
    description: "Avancerad lösning för företag med högre krav.",
    monthlyPriceCents: 39900,
    yearlyPriceCents: 399000,
    currency: "SEK",
    entitlements: {
      storageBytes: 50 * GIB,
      maxPages: null,
      maxDomains: 10,
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
