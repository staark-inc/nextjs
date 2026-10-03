import type { Metadata } from "next";
import { headers } from "next/headers";
import { buildRootMetadata, localBusinessJsonLd, jsonLdString } from "@staark/platform/server";
import { presetToCssVars, cssVarsToString, resolvePreset } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime, SiteHeader, SiteFooter } from "@/staark.config";
import { resolveTenantContext } from "@/lib/tenant-context";
import { SaasAccessBlocked } from "./SaasAccessBlocked";
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
    return <SaasAccessBlocked />;
  }

  const site = await content.getSite();
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
    </>
  );
}
