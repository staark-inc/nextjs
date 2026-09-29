import type { Metadata, MetadataRoute } from "next";
import type { Page, PageSummary, SiteSettings } from "@staark/core";

/**
 * SEO helpers — the Next.js side of the Hub SEO module. Titles, descriptions,
 * canonical URLs, Open Graph, robots, sitemap and LocalBusiness JSON-LD are all
 * generated from Hub content; nothing is configured twice.
 */

function absolute(site: SiteSettings, href: string): string {
  return new URL(href, site.url).toString();
}

/** Runtime switch for staging/preview deployments. */
export function indexingAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.STAARK_ALLOW_INDEXING !== "0";
}

export function buildMetadata(site: SiteSettings, page?: Page | null): Metadata {
  const baseTitle = page ? (page.seo.title ?? page.title) : site.name;
  const isHome = !page || page.path === "/";
  const title = isHome ? { absolute: page?.seo.title ?? `${site.name}${site.tagline ? ` – ${site.tagline}` : ""}` } : baseTitle;
  const description = page?.seo.description ?? site.seo.defaultDescription;
  const ogImage = page?.seo.ogImage ?? site.seo.ogImage;
  const plainTitle =
    typeof title === "string" ? title : title.absolute;
  const allowIndexing = indexingAllowed();

  return {
    metadataBase: new URL(site.url),
    title,
    description,
    alternates: { canonical: page ? page.path : "/" },
    robots: !allowIndexing
      ? { index: false, follow: false }
      : page?.seo.noindex
        ? { index: false, follow: true }
        : undefined,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale.replace("-", "_"),
      url: page ? page.path : "/",
      title: plainTitle,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: plainTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/** Root layout metadata: title template from the Hub. */
export function buildRootMetadata(site: SiteSettings): Metadata {
  const {
    alternates: _alternates,
    openGraph,
    ...rest
  } = buildMetadata(site);

  const siteOpenGraph = openGraph
    ? ({ ...openGraph } as Record<string, unknown>)
    : undefined;

  if (siteOpenGraph) {
    delete siteOpenGraph.url;
  }

  return {
    ...rest,
    openGraph: siteOpenGraph as Metadata["openGraph"],
    title: {
      default: site.name,
      template: site.seo.titleTemplate.includes("%s")
        ? site.seo.titleTemplate
        : `%s | ${site.name}`,
    },
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
  const allow = opts.allowIndexing ?? indexingAllowed();
  return {
    rules: allow
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/admin"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: allow ? absolute(site, "/sitemap.xml") : undefined,
  };
}

export function localBusinessJsonLd(
  site: SiteSettings,
): Record<string, unknown> {
  const { contact } = site;

  const home = absolute(site, "/");
  const businessId = `${home}#business`;
  const websiteId = `${home}#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": site.seo.businessType,
        "@id": businessId,
        name: site.name,
        url: home,
        description: site.seo.defaultDescription,
        email: contact.email,
        telephone: contact.phone,
        image: site.seo.ogImage
          ? absolute(site, site.seo.ogImage)
          : undefined,
        logo: site.brand.logo
          ? absolute(site, site.brand.logo.src)
          : undefined,
        address: contact.address
          ? {
              "@type": "PostalAddress",
              streetAddress: contact.address.street,
              postalCode: contact.address.postalCode,
              addressLocality: contact.address.city,
              addressCountry: contact.address.country,
            }
          : undefined,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: site.name,
        url: home,
        inLanguage: site.locale,
        publisher: {
          "@id": businessId,
        },
      },
    ],
  };
}

/** Safe for <script type="application/ld+json">: escapes "<" so content cannot close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
