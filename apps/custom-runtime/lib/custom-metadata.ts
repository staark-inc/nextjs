import type { Metadata } from "next";
import type { Page, SiteSettings } from "@staark/core";

export function customPageMetadata(page: Page, site: SiteSettings): Metadata {
  const title = page.seo.title ?? page.title;
  const description = page.seo.description ?? site.seo.defaultDescription;
  const canonical = new URL(page.path, site.url).href;
  const image = page.seo.ogImage ?? site.seo.ogImage;
  return {
    title, description,
    alternates: { canonical },
    robots: { index: !page.seo.noindex, follow: true },
    openGraph: { title, description, url: canonical, type: "website", siteName: site.name, locale: site.locale.replace("-", "_"), ...(image ? { images: [new URL(image, site.url).href] } : {}) },
  };
}
