import type { Metadata } from "next";
import { headers } from "next/headers";
import { buildRootMetadata, localBusinessJsonLd, jsonLdString } from "@staark/platform/server";
import { presetToCssVars, cssVarsToString, resolvePreset } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime, SiteHeader, SiteFooter } from "@/staark.config";
import { resolveTenantContext } from "@/lib/tenant-context";
import { resolvePublicContentConfig } from "@/lib/content-source";
import { SaasAccessBlocked } from "./SaasAccessBlocked";
import ConsentMode from "./ConsentMode";
import CookieConsent from "./CookieConsent";
import GoogleAnalytics from "./GoogleAnalytics";
import { resolveGoogleAnalyticsSettings } from "@/lib/google-analytics-settings";
import PublicAnalytics from "./PublicAnalytics";
import { canUsePlanFeature } from "@/lib/feature-access";
import "@staark/theme-light/styles.css";
import "@staark/theme-salong/styles.css";
import "@staark/theme-skonhet/styles.css";
import "@staark/theme-el/styles.css";
import "@staark/theme-gastfrihet/styles.css";
import "@staark/theme-byra/styles.css";
import "@staark/theme-webb/styles.css";
import "@staark/theme-verkstad/styles.css";

import "@staark/theme-kreator/styles.css";
/**
 * Public content is mutable at runtime through the ACP and persistent storage.
 * Never serve the build-time prerender after a container restart/recreate.
 */
export const dynamic = "force-dynamic";

async function currentTenant() {
  const config = resolvePublicContentConfig();

  if (config.source !== "postgres") {
    return null;
  }

  try {
    const requestHeaders = await headers();

    return resolveTenantContext({
      host: requestHeaders.get("host"),
      forwardedHost:
        requestHeaders.get("x-forwarded-host"),
    });
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant();

  if (tenant && !tenant.publicAccess) {
    return {
      title: "Webbplatsen är tillfälligt inaktiverad",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const site = await content.getSite();
  return buildRootMetadata(site);
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tenant = await currentTenant();

  if (tenant && !tenant.publicAccess) {
    return (
      <SaasAccessBlocked
        status={tenant.subscriptionStatus}
      />
    );
  }

  const site = await content.getSite();

  const googleAnalytics =
    resolveGoogleAnalyticsSettings(site);

  const runtime = resolveThemeRuntime(site.theme.family);
  const preset = resolvePreset(runtime.theme, site.theme.preset);
  const vars = presetToCssVars(preset, site.theme.overrides);
  const components = { ...preset.components, ...site.theme.components };

  return (
    <>
      <style>{`:root{${cssVarsToString(vars)}}`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(localBusinessJsonLd(site)) }} />
      <SiteHeader site={site} variant={components.header ?? "solid"} />
      <main>{children}</main>
      <SiteFooter site={site} variant={components.footer ?? "dark"} />

      <ConsentMode />

      <GoogleAnalytics
        enabled={
          googleAnalytics.enabled
        }
        measurementId={
          googleAnalytics.measurementId
        }
        consentRequired={
          googleAnalytics.consentRequired
        }
        consentVersion={
          site.privacy.consentVersion
        }
      />

      <CookieConsent
        settings={{
          cookieBannerEnabled:
            site.privacy.cookieBannerEnabled,
          analyticsConsentEnabled:
            site.privacy.analyticsConsentEnabled,
          marketingConsentEnabled:
            site.privacy.marketingConsentEnabled,
          consentVersion:
            site.privacy.consentVersion,
          bannerTitle:
            site.privacy.bannerTitle,
          bannerDescription:
            site.privacy.bannerDescription,
          privacyPolicyPath:
            site.privacy.privacyPolicyPath,
          cookiePolicyPath:
            site.privacy.cookiePolicyPath,
        }}
      />

      <PublicAnalytics
        enabled={Boolean(
          tenant &&
            canUsePlanFeature(
              tenant.entitlements,
              "analytics",
            ),
        )}
      />
    </>
  );
}
