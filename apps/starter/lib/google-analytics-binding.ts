import type {
  SiteSettings,
} from "@staark/core";

import {
  getPrismaClient,
} from "./db/prisma";

import {
  resolveGoogleAnalyticsSettings,
  type GoogleAnalyticsSettings,
} from "./google-analytics-settings";

export type TenantGoogleAnalyticsSettings =
  GoogleAnalyticsSettings & {
    bound: boolean;
    verifiedAt: string | null;
  };

function disabled():
TenantGoogleAnalyticsSettings {
  return {
    enabled: false,
    measurementId:
      undefined,
    propertyId:
      undefined,
    consentRequired: true,
    bound: false,
    verifiedAt: null,
  };
}

/**
 * SaaS path.
 *
 * The database binding is authoritative. Site.settings is intentionally not
 * consulted here because it is client-editable content.
 */
export async function readGoogleAnalyticsBinding(
  siteId: string,
): Promise<TenantGoogleAnalyticsSettings> {
  const binding =
    await getPrismaClient()
      .googleAnalyticsBinding
      .findUnique({
        where: {
          siteId,
        },
      });

  if (!binding) {
    return disabled();
  }

  return {
    enabled:
      binding.enabled,

    measurementId:
      binding.measurementId,

    propertyId:
      binding.propertyId,

    consentRequired:
      binding.consentRequired,

    bound: true,

    verifiedAt:
      binding.verifiedAt
        ?.toISOString() ??
      null,
  };
}

/**
 * Legacy/local deployments keep their existing SiteSettings behaviour.
 * PostgreSQL SaaS callers must provide siteId and therefore use the binding.
 */
export async function resolveTenantGoogleAnalyticsSettings(
  site: SiteSettings,
  siteId: string | null,
): Promise<TenantGoogleAnalyticsSettings> {
  if (!siteId) {
    return {
      ...resolveGoogleAnalyticsSettings(
        site,
      ),

      bound: false,
      verifiedAt: null,
    };
  }

  return readGoogleAnalyticsBinding(
    siteId,
  );
}

export class GoogleAnalyticsBindingConflictError
extends Error {
  constructor() {
    super(
      "This GA4 Measurement ID or Property ID is already bound to another Staark website.",
    );

    this.name =
      "GoogleAnalyticsBindingConflictError";
  }
}

async function ensureBindingAvailable(
  input: {
    siteId: string;
    measurementId: string;
    propertyId: string;
  },
): Promise<void> {
  const conflict =
    await getPrismaClient()
      .googleAnalyticsBinding
      .findFirst({
        where: {
          siteId: {
            not:
              input.siteId,
          },

          OR: [
            {
              measurementId:
                input.measurementId,
            },

            {
              propertyId:
                input.propertyId,
            },
          ],
        },

        select: {
          siteId: true,
        },
      });

  if (conflict) {
    throw new GoogleAnalyticsBindingConflictError();
  }
}

export async function bindGoogleAnalyticsProperty(
  input: {
    siteId: string;
    measurementId: string;
    propertyId: string;
    enabled: boolean;
    consentRequired: boolean;
  },
): Promise<TenantGoogleAnalyticsSettings> {
  await ensureBindingAvailable({
    siteId:
      input.siteId,

    measurementId:
      input.measurementId,

    propertyId:
      input.propertyId,
  });

  const saved =
    await getPrismaClient()
      .googleAnalyticsBinding
      .upsert({
        where: {
          siteId:
            input.siteId,
        },

        create: {
          siteId:
            input.siteId,

          measurementId:
            input.measurementId,

          propertyId:
            input.propertyId,

          enabled:
            input.enabled,

          consentRequired:
            input.consentRequired,

          verifiedAt:
            new Date(),
        },

        update: {
          measurementId:
            input.measurementId,

          propertyId:
            input.propertyId,

          enabled:
            input.enabled,

          consentRequired:
            input.consentRequired,

          verifiedAt:
            new Date(),
        },
      });

  return {
    enabled:
      saved.enabled,

    measurementId:
      saved.measurementId,

    propertyId:
      saved.propertyId,

    consentRequired:
      saved.consentRequired,

    bound: true,

    verifiedAt:
      saved.verifiedAt
        ?.toISOString() ??
      null,
  };
}
