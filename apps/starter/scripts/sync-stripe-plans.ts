import { disconnectPrismaClient, getPrismaClient } from "../lib/db/prisma";
import {
  createStripeProduct,
  createStripeRecurringPrice,
} from "../lib/stripe-billing";

async function main() {
  const prisma = getPrismaClient();
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { monthlyPriceCents: "asc" },
  });

  for (const plan of plans) {
    let productId = plan.stripeProductId;

    if (!productId) {
      const product = await createStripeProduct({
        name: `Staark ${plan.name}`,
        description: plan.description,
        planKey: plan.key,
      });
      productId = product.id;
    }

    let monthlyId = plan.stripePriceMonthlyId;
    if (!monthlyId && plan.monthlyPriceCents !== null) {
      monthlyId = (
        await createStripeRecurringPrice({
          productId,
          amountCents: plan.monthlyPriceCents,
          currency: plan.currency,
          interval: "month",
          planKey: plan.key,
        })
      ).id;
    }

    let yearlyId = plan.stripePriceYearlyId;
    if (!yearlyId && plan.yearlyPriceCents !== null) {
      yearlyId = (
        await createStripeRecurringPrice({
          productId,
          amountCents: plan.yearlyPriceCents,
          currency: plan.currency,
          interval: "year",
          planKey: plan.key,
        })
      ).id;
    }

    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        stripeProductId: productId,
        stripePriceMonthlyId: monthlyId,
        stripePriceYearlyId: yearlyId,
      },
    });

    console.log(
      `${plan.key}: product=${productId} monthly=${monthlyId ?? "-"} yearly=${yearlyId ?? "-"}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
