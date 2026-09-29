import type { Page } from "@staark/core";

export type PageRecord = {
  id: string;
  siteId: string;
  page: Page;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PageReadOptions = {
  includeDeleted?: boolean;
};

export interface PageRepository {
  list(siteId: string, options?: PageReadOptions): Promise<PageRecord[]>;
  findById(
    siteId: string,
    pageId: string,
    options?: PageReadOptions,
  ): Promise<PageRecord | null>;
  findByPath(
    siteId: string,
    path: string,
    options?: PageReadOptions,
  ): Promise<PageRecord | null>;
  upsertByPath(siteId: string, page: Page): Promise<PageRecord>;
  replace(siteId: string, pageId: string, page: Page): Promise<PageRecord | null>;
  softDelete(
    siteId: string,
    pageId: string,
    deletedAt?: Date,
  ): Promise<PageRecord | null>;
}
