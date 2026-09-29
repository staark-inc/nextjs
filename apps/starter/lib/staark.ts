import { cache } from "react";
import {
  normalizePath,
  type Page,
  type PageSummary,
  type SiteSettings,
} from "@staark/core";
import {
  createStaarkContent,
  type StaarkContent,
} from "@staark/platform/server";

import { resolvePublicContentConfig } from "./content-source";
import {
  createPostgresRepositories,
  type RepositorySet,
} from "./repositories";
import { ensureLocalContentSeed } from "./storage";

const baseContent = createStaarkContent();
export const publicContentConfig = resolvePublicContentConfig();

async function withLocalSeed<T>(run: () => Promise<T>): Promise<T> {
  if (baseContent.connection.source === "fixtures") {
    await ensureLocalContentSeed();
  }
  return run();
}

/**
 * Existing Hub/fixture content client.
 *
 * This remains available as the rollback path during Storage v2 and continues
 * to own form submissions until that domain is migrated in a later phase.
 */
const legacyContent: StaarkContent = {
  connection: baseContent.connection,
  getSite: () => withLocalSeed(() => baseContent.getSite()),
  getPages: () => withLocalSeed(() => baseContent.getPages()),
  getPage: (pagePath) => withLocalSeed(() => baseContent.getPage(pagePath)),
  submitForm: (submission) =>
    withLocalSeed(() => baseContent.submitForm(submission)),
};

let repositorySet: RepositorySet | undefined;

function repositories(): RepositorySet {
  repositorySet ??= createPostgresRepositories();
  return repositorySet;
}

const fallbackWarnings = new Set<string>();

function warnFallback(scope: string, detail: string): void {
  const key = `${scope}:${detail}`;
  if (fallbackWarnings.has(key)) return;
  fallbackWarnings.add(key);
  console.warn(
    `[staark] PostgreSQL public-content read fell back to legacy for ${scope}: ${detail}`,
  );
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function withConfiguredFallback<T>(
  scope: string,
  readPostgres: () => Promise<T>,
  readLegacy: () => Promise<T>,
): Promise<T> {
  try {
    return await readPostgres();
  } catch (error) {
    if (publicContentConfig.fallback !== "legacy") throw error;
    warnFallback(scope, errorDetail(error));
    return readLegacy();
  }
}

const postgresSiteRecord = cache(async () => {
  const site = await repositories().sites.findByKey(publicContentConfig.siteKey);
  if (!site) {
    throw new Error(
      `No PostgreSQL Site exists for STAARK_SITE_KEY="${publicContentConfig.siteKey}".`,
    );
  }
  return site;
});

const postgresSite = cache(async (): Promise<SiteSettings> => {
  return (await postgresSiteRecord()).settings;
});

const postgresPages = cache(async (): Promise<PageSummary[]> => {
  const site = await postgresSiteRecord();
  const pages = await repositories().pages.list(site.id);

  return pages.map(({ page }) => ({
    path: page.path,
    updatedAt: page.updatedAt,
    noindex: page.seo.noindex,
  }));
});

const postgresPage = cache(async (pagePath: string): Promise<Page | null> => {
  const site = await postgresSiteRecord();
  const record = await repositories().pages.findByPath(site.id, pagePath);
  return record?.page ?? null;
});

const postgresContent: StaarkContent = {
  // Connection still describes the existing Hub/fixture transport. Public
  // reads are selected independently through STAARK_DATA_SOURCE.
  connection: baseContent.connection,

  getSite: () =>
    withConfiguredFallback(
      "site",
      () => postgresSite(),
      () => legacyContent.getSite(),
    ),

  getPages: () =>
    withConfiguredFallback(
      "page list",
      () => postgresPages(),
      () => legacyContent.getPages(),
    ),

  async getPage(input) {
    const pagePath = normalizePath(input);

    try {
      const page = await postgresPage(pagePath);
      if (page || publicContentConfig.fallback !== "legacy") return page;

      warnFallback(pagePath, "page does not exist in PostgreSQL");
      return legacyContent.getPage(pagePath);
    } catch (error) {
      if (publicContentConfig.fallback !== "legacy") throw error;

      warnFallback(pagePath, errorDetail(error));
      return legacyContent.getPage(pagePath);
    }
  },

  // PHASE 4 migrates public reads only. Inbox/submission persistence is still
  // legacy/Hub-owned until its dedicated Storage v2 phase.
  submitForm: (submission) => legacyContent.submitForm(submission),
};

/**
 * One public content boundary for layout, pages, metadata, sitemap and forms.
 *
 * Default is legacy, so applying this patch alone changes no runtime behavior.
 * Set STAARK_DATA_SOURCE=postgres only after importing and verifying the site.
 */
export const content: StaarkContent =
  publicContentConfig.source === "postgres"
    ? postgresContent
    : legacyContent;
