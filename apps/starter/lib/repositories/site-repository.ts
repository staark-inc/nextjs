import type { SiteSettings } from "@staark/core";

export type SiteRecord = {
  id: string;
  key: string;
  settings: SiteSettings;
  createdAt: string;
  updatedAt: string;
};

export type UpsertSiteInput = {
  key: string;
  settings: SiteSettings;
};

export interface SiteRepository {
  findById(siteId: string): Promise<SiteRecord | null>;
  findByKey(key: string): Promise<SiteRecord | null>;
  upsertByKey(input: UpsertSiteInput): Promise<SiteRecord>;
}
