import {
  disconnectPrismaClient,
  getPrismaClient,
} from "../lib/db/prisma";
import { issueSetupClaimForSite } from "../lib/setup-claim";

const DEMO = {
  email: "demo@staark.app",
  userName: "Staark Demo",
  organizationName: "Staark Demo AB",
  organizationSlug: "staark-demo",
  siteKey: "demo-saas",
  siteName: "Staark SaaS Demo",
  hostname: "demo.staark.app",
  planKey: "saas",
} as const;

async function main() {
  const prisma = getPrismaClient();

  const plan = await prisma.plan.findUnique({
    where: { key: DEMO.planKey },
  });

  if (!plan) {
    throw new Error(
      `Plan "${DEMO.planKey}" was not found. Run the SaaS plan seed first.`,
    );
  }

  const publicUrl = `https://${DEMO.hostname}`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: DEMO.email },
      create: {
        email: DEMO.email,
        name: DEMO.userName,
        status: "active",
      },
      update: {
        name: DEMO.userName,
        status: "active",
      },
    });

    const organization = await tx.organization.upsert({
      where: { slug: DEMO.organizationSlug },
      create: {
        name: DEMO.organizationName,
        slug: DEMO.organizationSlug,
      },
      update: {
        name: DEMO.organizationName,
      },
    });

    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      },
      update: {
        role: "owner",
      },
    });

    const site = await tx.site.upsert({
      where: { key: DEMO.siteKey },
      create: {
        key: DEMO.siteKey,
        name: DEMO.siteName,
        organizationId: organization.id,
        settings: {
          name: DEMO.siteName,
          url: publicUrl,
        },
        setupCompletedAt: null,
      },
      update: {
        name: DEMO.siteName,
        organizationId: organization.id,
        settings: {
          name: DEMO.siteName,
          url: publicUrl,
        },
      },
    });

    const domain = await tx.domain.upsert({
      where: { hostname: DEMO.hostname },
      create: {
        siteId: site.id,
        hostname: DEMO.hostname,
        type: "platform",
        verified: true,
        primaryDomain: true,
        sslStatus: "active",
      },
      update: {
        siteId: site.id,
        type: "platform",
        verified: true,
        primaryDomain: true,
        sslStatus: "active",
      },
    });

    const existingSubscription = await tx.subscription.findUnique({
      where: { siteId: site.id },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

    const subscription = existingSubscription
      ? await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            organizationId: organization.id,
            planId: plan.id,
            provider: "manual",
            status: "active",
            billingInterval: "monthly",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        })
      : await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: plan.id,
            siteId: site.id,
            provider: "manual",
            status: "active",
            billingInterval: "monthly",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

    const usage = await tx.siteUsage.upsert({
      where: { siteId: site.id },
      create: {
        siteId: site.id,
      },
      update: {},
    });

    return {
      user,
      organization,
      site,
      domain,
      subscription,
      usage,
    };
  });

  const setupClaim = result.site.setupCompletedAt
    ? null
    : await issueSetupClaimForSite(DEMO.siteKey);

  console.log("Seeded demo SaaS tenant:");
  console.log(`  user:         ${result.user.email}`);
  console.log(`  organization: ${result.organization.slug}`);
  console.log(`  site:         ${result.site.key}`);
  console.log(`  hostname:     ${result.domain.hostname}`);
  console.log(`  url:          ${publicUrl}`);
  console.log(`  plan:         ${DEMO.planKey}`);
  console.log(`  subscription: ${result.subscription.status}`);
  console.log(`  storage:      ${result.usage.storageBytes.toString()} bytes`);
  if (setupClaim) {
    console.log(
      `  setup:        https://${DEMO.hostname}/setup/claim?token=${setupClaim.token}`,
    );
    console.log(`  setup expires: ${setupClaim.expiresAt.toISOString()}`);
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
