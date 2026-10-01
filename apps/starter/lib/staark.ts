import { randomUUID } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
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
import { resolveTenantContext } from "./tenant-context";

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

const requestTenant = cache(async () => {
  let host: string | null = null;
  let forwardedHost: string | null = null;

  try {
    const requestHeaders = await headers();
    host = requestHeaders.get("host");
    forwardedHost = requestHeaders.get("x-forwarded-host");
  } catch {
    // Build-time/one-shot jobs may not have a request context. In that case
    // resolveTenantContext can still use the explicit STAARK_SITE_KEY fallback.
  }

  return resolveTenantContext({ host, forwardedHost });
});

const postgresSiteKey = cache(async (): Promise<string> => {
  const tenant = await requestTenant();
  if (tenant) return tenant.siteKey;

  throw new Error(
    "No PostgreSQL tenant could be resolved from the request hostname. " +
      "For local/dev use, set STAARK_SITE_KEY or enable the tenant fallback.",
  );
});

const postgresSiteRecord = cache(async (siteKey: string) => {
  const site = await repositories().sites.findByKey(siteKey);
  if (!site) {
    throw new Error(`No PostgreSQL Site exists for site key="${siteKey}".`);
  }
  return site;
});

const postgresSite = cache(async (): Promise<SiteSettings> => {
  const siteKey = await postgresSiteKey();
  return (await postgresSiteRecord(siteKey)).settings;
});

const postgresPages = cache(async (): Promise<PageSummary[]> => {
  const siteKey = await postgresSiteKey();
  const site = await postgresSiteRecord(siteKey);
  const pages = await repositories().pages.list(site.id);

  return pages.map(({ page }) => ({
    path: page.path,
    updatedAt: page.updatedAt,
    noindex: page.seo.noindex,
  }));
});

const postgresPage = cache(async (pagePath: string): Promise<Page | null> => {
  const siteKey = await postgresSiteKey();
  const site = await postgresSiteRecord(siteKey);
  const record = await repositories().pages.findByPath(site.id, pagePath);
  return record?.page ?? null;
});


function newSubmissionReference(): string {
  return `SFS-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

async function submitPostgresForm(
  submission: Parameters<StaarkContent["submitForm"]>[0],
): Promise<void> {
  const repo = repositories();
  const siteKey = await postgresSiteKey();
  const site = await postgresSiteRecord(siteKey);

  const receivedAt = new Date().toISOString();
  await repo.submissions.create({
    siteId: site.id,
    id: newSubmissionReference(),
    formId: submission.formId,
    kind: submission.kind,
    fields: submission.fields,
    pageUrl: submission.pageUrl,
    meta: submission.meta,
    status: "new",
    bookingStatus: submission.kind === "booking" ? "pending" : undefined,
    receivedAt,
    activity: [
      {
        at: receivedAt,
        actor: "system",
        message: "Submission received",
      },
    ],
  });
}

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

  // PHASE 8: accepted forms persist in the same PostgreSQL tenant as content.
  // No dual-write: legacy/Hub submission persistence is used only in legacy mode.
  submitForm: (submission) => submitPostgresForm(submission),
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
