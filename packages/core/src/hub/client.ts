import { cache } from "react";
import {
  PageSchema,
  PageSummarySchema,
  SiteSettingsSchema,
  cacheTags,
  normalizePath,
  type FormSubmission,
  type Page,
  type PageSummary,
  type SiteSettings,
} from "../schema";
import { hubRequest, readStaarkEnv, HubError, type HubConnection } from "./connection";
import { fixturePage, fixturePages, fixtureSite, fixtureSubmit } from "./fixtures";

/**
 * Content API on Staark Hub (see docs/HUB-CONTENT-API.md):
 *   GET  /api/hub/next/site              → { ok, site }
 *   GET  /api/hub/next/pages             → { ok, pages: PageSummary[] }
 *   GET  /api/hub/next/page?path=/priser → { ok, page } | 404
 *   POST /api/hub/next/forms             → S-Hub Inbox submission
 */
export const HUB_PATHS = {
  site: "/api/hub/next/site",
  pages: "/api/hub/next/pages",
  page: (p: string) => `/api/hub/next/page?path=${encodeURIComponent(p)}`,
  forms: "/api/hub/next/forms",
} as const;

export type StaarkContent = {
  connection: HubConnection;
  getSite(): Promise<SiteSettings>;
  getPages(): Promise<PageSummary[]>;
  getPage(path: string | string[] | undefined): Promise<Page | null>;
  submitForm(submission: Omit<FormSubmission, "token" | "website"> & { meta?: Record<string, string> }): Promise<void>;
};

export function createStaarkContent(connection: HubConnection = readStaarkEnv()): StaarkContent {
  const fromHub = connection.source === "hub";

  // React cache() dedupes calls within one render (layout + page + metadata).
  const getSite = cache(async (): Promise<SiteSettings> => {
    if (!fromHub) return fixtureSite(connection.contentDir);
    const data = await hubRequest<{ site: unknown }>(connection, HUB_PATHS.site, { tags: [cacheTags.all, cacheTags.site] });
    return SiteSettingsSchema.parse(data.site);
  });

  const getPages = cache(async (): Promise<PageSummary[]> => {
    if (!fromHub) return fixturePages(connection.contentDir);
    const data = await hubRequest<{ pages: unknown }>(connection, HUB_PATHS.pages, { tags: [cacheTags.all, cacheTags.pages] });
    return PageSummarySchema.array().parse(data.pages);
  });

  const getPageByPath = cache(async (p: string): Promise<Page | null> => {
    if (!fromHub) return fixturePage(connection.contentDir, p);
    try {
      const data = await hubRequest<{ page: unknown }>(connection, HUB_PATHS.page(p), {
        tags: [cacheTags.all, cacheTags.page(p)],
      });
      return PageSchema.parse(data.page);
    } catch (error) {
      if (error instanceof HubError && error.status === 404) return null;
      throw error;
    }
  });

  return {
    connection,
    getSite,
    getPages,
    getPage: (p) => getPageByPath(normalizePath(p)),
    async submitForm(submission) {
      if (!fromHub) return fixtureSubmit(submission);
      await hubRequest(connection, HUB_PATHS.forms, { method: "POST", body: submission, cache: false });
    },
  };
}
