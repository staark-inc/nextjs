import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata } from "@staark/platform/server";
import { BlockRenderer } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime } from "@/staark.config";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([content.getSite(), content.getPage([])]);
  if (!page) return {};
  return buildMetadata(site, page);
}

export default async function HomePage() {
  const [site, page] = await Promise.all([content.getSite(), content.getPage([])]);
  if (!page) notFound();

  const runtime = resolveThemeRuntime(site.theme.family);
  return <BlockRenderer blocks={page.blocks} site={site} theme={runtime.theme} registry={runtime.registry} />;
}
