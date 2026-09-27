import type { Metadata } from "next";
import { buildRootMetadata, localBusinessJsonLd, jsonLdString } from "@staark/platform/server";
import { presetToCssVars, cssVarsToString, resolvePreset } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime, SiteHeader, SiteFooter } from "@/staark.config";
import "@staark/theme-light/styles.css";
import "@staark/theme-salong/styles.css";
import "@staark/theme-gastfrihet/styles.css";
import "@staark/theme-byra/styles.css";
import "@staark/theme-webb/styles.css";

/**
 * Public content is mutable at runtime through the ACP and persistent storage.
 * Never serve the build-time prerender after a container restart/recreate.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await content.getSite();
  return buildRootMetadata(site);
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
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
