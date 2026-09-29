import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata } from "@staark/platform/server";
import { BlockRenderer } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime } from "@/staark.config";
import { StaarkImage } from "@/components/StaarkImage";
import { hydrateVerticalPage } from "@/lib/vertical-content";

type Params = { slug: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  const pages = await content.getPages();
  return pages
    .filter((p) => p.path !== "/")
    .map((p) => ({ slug: p.path.slice(1).split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const [site, page] = await Promise.all([content.getSite(), content.getPage(slug)]);
  if (!page) return {};
  return buildMetadata(site, page);
}

export default async function StaarkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [site, page] = await Promise.all([content.getSite(), content.getPage(slug)]);
  if (!page) notFound();

  const runtime = resolveThemeRuntime(site.theme.family);
  const hydratedPage = await hydrateVerticalPage(site, page);

  return (
    <BlockRenderer
      blocks={hydratedPage.blocks}
      site={site}
      theme={runtime.theme}
      registry={runtime.registry}
      image={StaarkImage}
    />
  );
}
