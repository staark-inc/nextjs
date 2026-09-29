import type { PageRepository } from "./page-repository";
import type { RedirectRepository } from "./redirect-repository";
import type { RevisionRepository } from "./revision-repository";
import type { SiteRepository } from "./site-repository";

export type RepositorySet = {
  sites: SiteRepository;
  pages: PageRepository;
  revisions: RevisionRepository;
  redirects: RedirectRepository;
};

export type RepositoryTransaction = <T>(
  work: (repositories: RepositorySet) => Promise<T>,
) => Promise<T>;
