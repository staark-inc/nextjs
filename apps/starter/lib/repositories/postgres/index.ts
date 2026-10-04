import { getPrismaClient } from "@/lib/db/prisma";

import type {
  RepositorySet,
  RepositoryTransaction,
} from "../repository-set";
import type { RepositoryDbClient } from "./db-client";
import { PostgresPageRepository } from "./page-repository";
import { PostgresPublicationRepository } from "./publication-repository";
import { PostgresRedirectRepository } from "./redirect-repository";
import { PostgresRevisionRepository } from "./revision-repository";
import { PostgresSiteRepository } from "./site-repository";
import { PostgresSubmissionRepository } from "./submission-repository";
import { PostgresServiceCatalogRepository } from "./service-catalog-repository";

export function createPostgresRepositories(
  db: RepositoryDbClient = getPrismaClient(),
): RepositorySet {
  return {
    sites: new PostgresSiteRepository(db),
    pages: new PostgresPageRepository(db),
    revisions: new PostgresRevisionRepository(db),
    publications: new PostgresPublicationRepository(db),
    redirects: new PostgresRedirectRepository(db),
    submissions: new PostgresSubmissionRepository(db),
    serviceCatalogs: new PostgresServiceCatalogRepository(db),
  };
}

/**
 * Use this boundary for workflows that must update multiple repositories
 * atomically, for example: revision + page write + redirect in a later phase.
 */
export const withPostgresTransaction: RepositoryTransaction = async (work) => {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction) => {
    return work(createPostgresRepositories(transaction));
  });
};
