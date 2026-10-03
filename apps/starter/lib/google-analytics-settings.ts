import type { SiteSettings } from "@staark/core";

export type GoogleAnalyticsSettings = {
  enabled: boolean;
  measurementId?: string;
  consentRequired: boolean;
};

export const DEFAULT_GOOGLE_ANALYTICS_SETTINGS: GoogleAnalyticsSettings = {
  enabled: false,
  measurementId: undefined,
  consentRequired: true,
};

export function resolveGoogleAnalyticsSettings(
  site: SiteSettings,
): GoogleAnalyticsSettings {
  const analytics = site.analytics?.googleAnalytics;

  if (!analytics) {
    return {
      ...DEFAULT_GOOGLE_ANALYTICS_SETTINGS,
    };
  }

  return {
    enabled: analytics.enabled === true,
    measurementId:
      typeof analytics.measurementId === "string" &&
      analytics.measurementId.trim()
        ? analytics.measurementId.trim().toUpperCase()
        : undefined,
    consentRequired:
      analytics.consentRequired !== false,
  };
}
