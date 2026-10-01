import type { PageRepository } from "./page-repository";
import type { RedirectRepository } from "./redirect-repository";
import type { RevisionRepository } from "./revision-repository";
import type { SiteRepository } from "./site-repository";
import type { SubmissionRepository } from "./submission-repository";
import type { ServiceCatalogRepository } from "./service-catalog-repository";

export type RepositorySet = {
  sites: SiteRepository;
  pages: PageRepository;
  revisions: RevisionRepository;
  redirects: RedirectRepository;
  submissions: SubmissionRepository;
  serviceCatalogs: ServiceCatalogRepository;
};

export type RepositoryTransaction = <T>(
  work: (repositories: RepositorySet) => Promise<T>,
) => Promise<T>;
