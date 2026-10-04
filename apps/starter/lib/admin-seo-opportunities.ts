import {
  requireAdminTenantContext,
} from "./admin-tenant";

import {
  readAdminSiteSettings,
} from "./admin-site-settings";

import {
  createPostgresRepositories,
} from "./repositories";

import {
  auditPageSeo,
} from "./seo-audit";

import {
  buildSeoOpportunities,
  type SeoOpportunitiesResult,
} from "./seo-opportunities";

export async function readAdminSeoOpportunities():
Promise<SeoOpportunitiesResult> {
  const tenant =
    await requireAdminTenantContext();

  const site =
    await readAdminSiteSettings();

  const publications =
    await createPostgresRepositories()
      .publications
      .list(
        tenant.siteId,
      );

  return buildSeoOpportunities(
    publications.map(
      (publication) => ({
        pageId:
          publication.pageId,

        path:
          publication.path,

        title:
          publication.page.title,

        noindex:
          Boolean(
            publication.page.seo
              .noindex,
          ),

        audit:
          auditPageSeo(
            publication.page,
            {
              defaultOgImage:
                site.seo.ogImage,
            },
          ),
      }),
    ),
  );
}
