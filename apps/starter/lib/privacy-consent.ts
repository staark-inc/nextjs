export const STAARK_CONSENT_STORAGE_KEY =
  "staark-consent-v1";

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt: string;
};

export type PublicPrivacySettings = {
  cookieBannerEnabled: boolean;
  analyticsConsentEnabled: boolean;
  marketingConsentEnabled: boolean;
  consentVersion: string;
  bannerTitle: string;
  bannerDescription: string;
  privacyPolicyPath: string;
  cookiePolicyPath: string;
};

export function defaultConsent(
  version: string,
): ConsentPreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    version,
    updatedAt: new Date().toISOString(),
  };
}

export function parseStoredConsent(
  raw: string | null,
  version: string,
): ConsentPreferences | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;

    if (
      parsed.necessary !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      parsed.version !== version
    ) {
      return null;
    }

    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      version: parsed.version,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
