import type { Page } from "@staark/core";

export const PAGE_REVISION_LIMIT = 50;

export type PageRevisionRecord = {
  id: string;
  siteId: string;
  pageId: string;
  reason: string;
  checksum: string;
  page: Page;
  createdAt: string;
};

export type CreatePageRevisionInput = {
  siteId: string;
  pageId: string;
  reason: string;
  page: Page;
  /**
   * Optional during legacy import so the existing sha256 can be preserved.
   * New revisions calculate the checksum when this field is omitted.
   */
  checksum?: string;
  /** Preserve the historical timestamp when importing legacy revisions. */
  createdAt?: Date;
};

export interface RevisionRepository {
  list(
    siteId: string,
    pageId: string,
    options?: { limit?: number },
  ): Promise<PageRevisionRecord[]>;

  listRecent(
    siteId: string,
    options?: { limit?: number },
  ): Promise<PageRevisionRecord[]>;
  findById(
    siteId: string,
    pageId: string,
    revisionId: string,
  ): Promise<PageRevisionRecord | null>;
  create(input: CreatePageRevisionInput): Promise<PageRevisionRecord>;
}
