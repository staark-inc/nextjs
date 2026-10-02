import { createHash } from "node:crypto";

import { getPrismaClient } from "./db/prisma";
import {
  createFirstSetup,
  type FirstSetupInput,
} from "./first-setup";
import { issueSetupClaimForSite } from "./setup-claim";

export type HubProvisioningInput = {
  hubSubscriptionId: string;
  hubProvisioningId: string;
  hubClientId: string;
  environment: "TEST" | "LIVE";

  stripeCustomerId: string;
  stripeSubscriptionId: string;

  customerName: string;
  customerEmail: string;

  planCode: "STARTER" | "SAAS" | "BUSINESS";
  billingInterval: "MONTH" | "YEAR";
  status: string;

  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
  cancelAtPeriodEnd?: boolean;

  hostname?: string;
  domainType?: "platform";
  setup?: FirstSetupInput;
};

const PLAN_KEYS = {
  STARTER: "start",
  SAAS: "saas",
  BUSINESS: "business",
} as const;

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function optionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

function subscriptionStatus(value: string): string {
  return required(value, "status").toLowerCase();
}

export async function provisionFromHub(raw: HubProvisioningInput) {
  const hubSubscriptionId = required(
    raw.hubSubscriptionId,
    "hubSubscriptionId",
  );
  required(raw.hubProvisioningId, "hubProvisioningId");
  required(raw.hubClientId, "hubClientId");

  const stripeCustomerId = required(
    raw.stripeCustomerId,
    "stripeCustomerId",
  );
  const stripeSubscriptionId = required(
    raw.stripeSubscriptionId,
    "stripeSubscriptionId",
  );

  const customerName = required(raw.customerName, "customerName");
  const customerEmail = required(raw.customerEmail, "customerEmail")
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new Error("customerEmail must be valid.");
  }

  const planKey = PLAN_KEYS[raw.planCode];
  if (!planKey) {
    throw new Error(`Unsupported planCode: ${raw.planCode}`);
  }

  const platformDomain =
    process.env.STAARK_PLATFORM_DOMAIN?.trim().toLowerCase() || "staark.app";

  const suffix = digest(hubSubscriptionId).slice(0, 8);
  const fullDigest = digest(hubSubscriptionId);

  const configuredName =
    raw.setup?.name?.trim() || customerName;

  const nameSlug =
    slugify(configuredName) || "site";

  const organizationSlug =
    `${nameSlug}-${suffix}`.slice(0, 120);

  const siteKey =
    `hub-${fullDigest.slice(0, 24)}`;

  const fallbackHostname =
    `${nameSlug}-${suffix}.${platformDomain}`;

  const hostname =
    raw.hostname?.trim().toLowerCase() ||
    fallbackHostname;

  const platformSuffix =
    `.${platformDomain}`;

  if (!hostname.endsWith(platformSuffix)) {
    throw new Error(
      `hostname must be a subdomain of ${platformDomain}.`,
    );
  }

  const hostnameLabel =
    hostname.slice(
      0,
      -platformSuffix.length,
    );

  if (
    !hostnameLabel ||
    hostnameLabel.includes(".") ||
    hostnameLabel.length > 63 ||
    hostnameLabel.includes("--") ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
      hostnameLabel,
    )
  ) {
    throw new Error(
      "hostname contains an invalid platform subdomain.",
    );
  }

  const siteUrl =
    `https://${hostname}`;

  const ownerEmail =
    raw.setup?.owner?.email
      ?.trim()
      .toLowerCase() ||
    customerEmail;

  const ownerName =
    raw.setup?.owner?.name?.trim() ||
    customerName;

  const prisma = getPrismaClient();

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUnique({
      where: { key: planKey },
    });

    if (!plan) {
      throw new Error(
        `Plan "${planKey}" does not exist. Run db:seed:saas-plans first.`,
      );
    }

    const user = await tx.user.upsert({
      where: { email: ownerEmail },
      create: {
        email: ownerEmail,
        name: ownerName,
        status: "active",
      },
      update: {
        name: ownerName,
        status: "active",
      },
    });

    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      create: {
        name: configuredName,
        slug: organizationSlug,
      },
      update: {},
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
      where: { key: siteKey },
      create: {
        key: siteKey,
        name: configuredName,
        organizationId: organization.id,
        settings: {
          name: configuredName,
          url: siteUrl,
        },
      },
      update: {
        name: configuredName,
        organizationId: organization.id,
      },
    });

    const occupiedDomain =
      await tx.domain.findUnique({
        where: { hostname },
        select: {
          siteId: true,
        },
      });

    if (
      occupiedDomain &&
      occupiedDomain.siteId !== site.id
    ) {
      throw new Error(
        `Hostname "${hostname}" is already in use.`,
      );
    }

    await tx.domain.deleteMany({
      where: {
        siteId: site.id,
        type: "platform",
        hostname: {
          not: hostname,
        },
      },
    });

    await tx.domain.upsert({
      where: { hostname },
      create: {
        siteId: site.id,
        hostname,
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

    const subscription = await tx.subscription.upsert({
      where: {
        providerSubscriptionId: stripeSubscriptionId,
      },
      create: {
        organizationId: organization.id,
        planId: plan.id,
        siteId: site.id,
        provider: "stripe",
        providerCustomerId: stripeCustomerId,
        providerSubscriptionId: stripeSubscriptionId,
        status: subscriptionStatus(raw.status),
        billingInterval:
          raw.billingInterval === "YEAR" ? "yearly" : "monthly",
        currentPeriodStart: optionalDate(raw.currentPeriodStart),
        currentPeriodEnd: optionalDate(raw.currentPeriodEnd),
        trialEndsAt: optionalDate(raw.trialEnd),
        cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
      },
      update: {
        organizationId: organization.id,
        planId: plan.id,
        siteId: site.id,
        providerCustomerId: stripeCustomerId,
        status: subscriptionStatus(raw.status),
        billingInterval:
          raw.billingInterval === "YEAR" ? "yearly" : "monthly",
        currentPeriodStart: optionalDate(raw.currentPeriodStart),
        currentPeriodEnd: optionalDate(raw.currentPeriodEnd),
        trialEndsAt: optionalDate(raw.trialEnd),
        cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
      },
    });

    await tx.siteUsage.upsert({
      where: { siteId: site.id },
      create: { siteId: site.id },
      update: {},
    });

    return {
      user,
      organization,
      site,
      subscription,
    };
  });

  let setupCompleted =
    Boolean(result.site.setupCompletedAt);

  if (
    raw.setup &&
    !setupCompleted
  ) {
    if (!raw.setup.owner) {
      throw new Error(
        "setup.owner is required.",
      );
    }

    await createFirstSetup(
      raw.setup,
      {
        host: hostname,
        forwardedHost: hostname,
      },
    );

    setupCompleted = true;
  }

  const setupClaim =
    setupCompleted
      ? null
      : await issueSetupClaimForSite(
          siteKey,
        );

  return {
    organizationId:
      result.organization.id,

    subscriptionId:
      result.subscription.id,

    siteId:
      result.site.id,

    siteKey,
    hostname,
    siteUrl,

    adminUrl:
      setupCompleted
        ? `${siteUrl}/admin/login`
        : null,

    domainType:
      "platform",

    domainVerified:
      true,

    setupUrl:
      setupClaim
        ? `https://${hostname}/setup/claim?token=${encodeURIComponent(
            setupClaim.token,
          )}`
        : null,

    setupExpiresAt:
      setupClaim?.expiresAt ?? null,

    setupCompleted,
  };
}
