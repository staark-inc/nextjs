import type { Metadata, MetadataRoute } from "next";
import type { Page, PageSummary, SiteSettings } from "../schema";

/**
 * SEO helpers — the Next.js side of the Hub SEO module. Titles, descriptions,
 * canonical URLs, Open Graph, robots, sitemap and LocalBusiness JSON-LD are all
 * generated from Hub content; nothing is configured twice.
 */

function absolute(site: SiteSettings, href: string): string {
  return new URL(href, site.url).toString();
}

export function buildMetadata(site: SiteSettings, page?: Page | null): Metadata {
  const baseTitle = page ? (page.seo.title ?? page.title) : site.name;
  const isHome = !page || page.path === "/";
  const title = isHome ? { absolute: page?.seo.title ?? `${site.name}${site.tagline ? ` – ${site.tagline}` : ""}` } : baseTitle;
  const description = page?.seo.description ?? site.seo.defaultDescription;
  const ogImage = page?.seo.ogImage ?? site.seo.ogImage;

  return {
    metadataBase: new URL(site.url),
    title,
    description,
    alternates: { canonical: page ? page.path : "/" },
    robots: page?.seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale.replace("-", "_"),
      url: page ? page.path : "/",
      title: typeof title === "string" ? title : title.absolute,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

/** Root layout metadata: title template from the Hub. */
export function buildRootMetadata(site: SiteSettings): Metadata {
  return {
    ...buildMetadata(site),
    title: { default: site.name, template: site.seo.titleTemplate.includes("%s") ? site.seo.titleTemplate : `%s | ${site.name}` },
  };
}

export function buildSitemap(site: SiteSettings, pages: PageSummary[]): MetadataRoute.Sitemap {
  return pages
    .filter((p) => !p.noindex)
    .map((p) => ({
      url: absolute(site, p.path),
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: p.path === "/" ? 1 : 0.7,
    }));
}

export function buildRobots(site: SiteSettings, opts: { allowIndexing?: boolean } = {}): MetadataRoute.Robots {
  const allow = opts.allowIndexing ?? process.env.STAARK_ALLOW_INDEXING !== "0";
  return {
    rules: allow ? [{ userAgent: "*", allow: "/", disallow: ["/api/"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: allow ? absolute(site, "/sitemap.xml") : undefined,
  };
}

export function localBusinessJsonLd(site: SiteSettings): Record<string, unknown> {
  const { contact } = site;
  return {
    "@context": "https://schema.org",
    "@type": site.seo.businessType,
    name: site.name,
    url: site.url,
    description: site.seo.defaultDescription,
    email: contact.email,
    telephone: contact.phone,
    image: site.seo.ogImage ? absolute(site, site.seo.ogImage) : undefined,
    logo: site.brand.logo ? absolute(site, site.brand.logo.src) : undefined,
    address: contact.address
      ? {
          "@type": "PostalAddress",
          streetAddress: contact.address.street,
          postalCode: contact.address.postalCode,
          addressLocality: contact.address.city,
          addressCountry: contact.address.country,
        }
      : undefined,
  };
}

/** Safe for <script type="application/ld+json">: escapes "<" so content cannot close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
