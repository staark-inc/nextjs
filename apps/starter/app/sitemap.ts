import type { MetadataRoute } from "next";
import { buildSitemap } from "@staark/platform/server";
import { content } from "@/lib/staark";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, pages] = await Promise.all([content.getSite(), content.getPages()]);
  return buildSitemap(site, pages);
}
