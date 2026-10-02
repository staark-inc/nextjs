import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata } from "@staark/platform/server";
import { BlockRenderer } from "@staark/theme-kit";
import { content } from "@/lib/staark";
import { resolveThemeRuntime } from "@/staark.config";
import { StaarkImage } from "@/components/StaarkImage";
import { hydrateVerticalPage } from "@/lib/vertical-content";

export async function generateMetadata(): Promise<Metadata> {
  if (process.env.STAARK_ROLE === "app") {
    return {
      title: "Staark SaaS",
      robots: { index: false, follow: false },
    };
  }

  const [site, page] = await Promise.all([content.getSite(), content.getPage([])]);
  if (!page) return {};
  return buildMetadata(site, page);
}

export default async function HomePage() {
  if (process.env.STAARK_ROLE === "app") {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Staark SaaS</h1>
        <p>Control plane is online.</p>
      </main>
    );
  }

  const [site, page] = await Promise.all([content.getSite(), content.getPage([])]);
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
