import type { Page } from "@staark/core";

export type PagePublicationRecord = {
  pageId: string;
  siteId: string;
  path: string;
  page: Page;
  checksum: string;
  publishedAt: string;
  updatedAt: string;
};

export type PublishPageInput = {
  siteId: string;
  pageId: string;
  page: Page;
  publishedAt?: Date;
};

export interface PublicationRepository {
  findByPageId(
    siteId: string,
    pageId: string,
  ): Promise<PagePublicationRecord | null>;

  findByPath(
    siteId: string,
    path: string,
  ): Promise<PagePublicationRecord | null>;

  list(siteId: string): Promise<PagePublicationRecord[]>;

  publish(input: PublishPageInput): Promise<PagePublicationRecord>;
}
