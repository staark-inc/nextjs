import {
  createHash,
  randomUUID,
} from "node:crypto";

import { getPrismaClient } from "./db/prisma";
import {
  createFirstSetup,
  type FirstSetupInput,
} from "./first-setup";
import { issueSetupClaimForSite } from "./setup-claim";
import { isReservedPlatformSubdomain } from "./platform-subdomains";
import {
  createCloudflareCustomHostname,
  findCloudflareCustomHostname,
  type CloudflareCustomHostname,
} from "./cloudflare-saas";

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
  cancelAtPeriodEnd?: boolean;

  hostname?: string;
  domainType?: "platform";

  domainMode?: "platform" | "custom";
  platformHostname?: string;
  customHostname?: string | null;

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

const HOST_LABEL =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeCustomHostname(
  value: string | null | undefined,
): string {
  if (!value) {
    throw new Error(
      "customHostname is required for custom domain provisioning.",
    );
  }

  let hostname =
    value.trim().toLowerCase();

  hostname =
    hostname.replace(/^https?:\/\//, "");

  hostname =
    hostname.replace(/\/.*$/, "");

  hostname =
    hostname.replace(/\.$/, "");

  if (
    !hostname ||
    hostname.length > 253 ||
    !hostname.includes(".")
  ) {
    throw new Error(
      "customHostname must be a valid domain name.",
    );
  }

  if (
    hostname.includes(":") ||
    hostname.includes("_")
  ) {
    throw new Error(
      "customHostname must not contain a port or underscore.",
    );
  }

  const labels = hostname.split(".");

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !HOST_LABEL.test(label),
    )
  ) {
    throw new Error(
      "customHostname contains an invalid hostname label.",
    );
  }

  if (
    hostname === "staark.app" ||
    hostname.endsWith(".staark.app")
  ) {
    throw new Error(
      "staark.app addresses cannot be used as custom domains.",
    );
  }

  return hostname;
}

function providerErrorMessage(
  hostname: CloudflareCustomHostname,
): string | null {
  const errors = [
    ...(hostname.verification_errors ?? []),

    ...(hostname.ssl?.validation_errors ?? [])
      .map((entry) => entry.message)
      .filter(
        (value): value is string =>
          Boolean(value),
      ),
  ];

  return errors.length
    ? errors.join(" ").slice(0, 2000)
    : null;
}

function providerData(
  hostname: CloudflareCustomHostname,
) {
  return {
    provider: "cloudflare",

    providerHostnameId:
      hostname.id,

    providerStatus:
      hostname.status ?? "pending",

    providerError:
      providerErrorMessage(hostname),

    ownershipVerificationName:
      hostname.ownership_verification
        ?.name ?? null,

    ownershipVerificationValue:
      hostname.ownership_verification
        ?.value ?? null,

    sslValidationRecords:
      JSON.parse(
        JSON.stringify(
          hostname.ssl
            ?.validation_records ??
            [],
        ),
      ),

    providerLastSyncAt:
      new Date(),

    sslStatus:
      hostname.ssl?.status ??
      "pending",
  };
}

function planAllowsCustomDomain(
  entitlements: unknown,
): boolean {
  if (
    !entitlements ||
    typeof entitlements !== "object" ||
    Array.isArray(entitlements)
  ) {
    return false;
  }

  return (
    (entitlements as Record<string, unknown>)
      .customDomain === true
  );
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

  const domainMode =
    raw.domainMode === "custom"
      ? "custom"
      : "platform";

  const platformHostname =
    (
      raw.platformHostname ??
      raw.hostname ??
      fallbackHostname
    )
      .trim()
      .toLowerCase();

  const platformSuffix =
    `.${platformDomain}`;

  if (
    !platformHostname.endsWith(
      platformSuffix,
    )
  ) {
    throw new Error(
      `platformHostname must be a subdomain of ${platformDomain}.`,
    );
  }

  const hostnameLabel =
    platformHostname.slice(
      0,
      -platformSuffix.length,
    );

  if (
    !hostnameLabel ||
    hostnameLabel.includes(".") ||
    hostnameLabel.length > 63 ||
    hostnameLabel.includes("--") ||
    !HOST_LABEL.test(hostnameLabel)
  ) {
    throw new Error(
      "platformHostname contains an invalid platform subdomain.",
    );
  }

  if (
    isReservedPlatformSubdomain(
      hostnameLabel,
    )
  ) {
    throw new Error(
      `Platform hostname "${platformHostname}" is reserved.`,
    );
  }

  const customHostname =
    domainMode === "custom"
      ? normalizeCustomHostname(
          raw.customHostname,
        )
      : null;

  // The platform hostname is always the safe technical
  // address during provisioning and DNS propagation.
  const hostname =
    platformHostname;

  const siteUrl =
    `https://${platformHostname}`;

  if (
    raw.setup &&
    !raw.setup.owner
  ) {
    throw new Error(
      "setup.owner is required when setup is provided.",
    );
  }

  const owner =
    raw.setup?.owner
      ? {
          email:
            required(
              raw.setup.owner.email,
              "setup.owner.email",
            ).toLowerCase(),

          name:
            required(
              raw.setup.owner.name,
              "setup.owner.name",
            ),
        }
      : null;

  if (
    owner &&
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(
      owner.email,
    )
  ) {
    throw new Error(
      "setup.owner.email must be valid.",
    );
  }

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

    if (
      domainMode === "custom" &&
      !planAllowsCustomDomain(
        plan.entitlements,
      )
    ) {
      throw new Error(
        "The selected plan does not include a custom domain.",
      );
    }

    const user =
      owner
        ? await tx.user.upsert({
            where: {
              email:
                owner.email,
            },

            create: {
              email:
                owner.email,

              name:
                owner.name,

              status:
                "active",
            },

            update: {
              name:
                owner.name,

              status:
                "active",
            },
          })
        : null;

    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      create: {
        name: configuredName,
        slug: organizationSlug,
      },
      update: {},
    });

    if (user) {
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId:
              organization.id,

            userId:
              user.id,
          },
        },

        create: {
          organizationId:
            organization.id,

          userId:
            user.id,

          role:
            "owner",
        },

        update: {
          role:
            "owner",
        },
      });
    }

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
        blockedAt: null,
        releaseAt: null,
        releasedAt: null,
      },
    });

    let customDomain = null;

    if (customHostname) {
      const occupiedCustom =
        await tx.domain.findUnique({
          where: {
            hostname:
              customHostname,
          },

          select: {
            id: true,
            siteId: true,
          },
        });

      if (
        occupiedCustom &&
        occupiedCustom.siteId !== site.id
      ) {
        throw new Error(
          `Custom hostname "${customHostname}" is already in use.`,
        );
      }

      customDomain =
        await tx.domain.upsert({
          where: {
            hostname:
              customHostname,
          },

          create: {
            siteId:
              site.id,

            hostname:
              customHostname,

            type:
              "custom",

            verified:
              false,

            primaryDomain:
              false,

            verificationToken:
              randomUUID(),

            sslStatus:
              "pending",

            provider:
              "cloudflare",

            providerStatus:
              "provisioning",
          },

          update: {
            siteId:
              site.id,

            type:
              "custom",

            primaryDomain:
              false,

            provider:
              "cloudflare",

            blockedAt:
              null,

            releaseAt:
              null,

            releasedAt:
              null,
          },
        });
    }

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
        trialEndsAt: null,
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
        trialEndsAt: null,
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
      customDomain,
    };
  });

  if (
    customHostname &&
    result.customDomain
  ) {
    try {
      const remote =
        (
          await findCloudflareCustomHostname(
            customHostname,
          )
        ) ??
        (
          await createCloudflareCustomHostname(
            customHostname,
          )
        );

      await prisma.domain.update({
        where: {
          id:
            result.customDomain.id,
        },

        data:
          providerData(remote),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cloudflare custom hostname provisioning failed.";

      // Keep the website alive on its Staark fallback.
      // The customer can retry domain verification later.
      await prisma.domain.update({
        where: {
          id:
            result.customDomain.id,
        },

        data: {
          providerStatus:
            "error",

          providerError:
            message.slice(
              0,
              2000,
            ),

          providerLastSyncAt:
            new Date(),
        },
      });

      console.error(
        "[STAARK] Custom hostname provisioning deferred:",
        error,
      );
    }
  }

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

    hostname:
      platformHostname,

    platformHostname,

    customHostname,

    customDomainPending:
      Boolean(customHostname),

    siteUrl,

    adminUrl:
      setupCompleted
        ? `${siteUrl}/admin/login`
        : null,

    domainType:
      customHostname
        ? "custom"
        : "platform",

    domainVerified:
      customHostname
        ? false
        : true,

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
