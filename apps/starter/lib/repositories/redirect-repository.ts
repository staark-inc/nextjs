import type { RedirectRule } from "../redirect-domain";

export type RedirectRecord = RedirectRule & {
  siteId: string;
};

export type SaveRedirectInput = RedirectRecord;

export interface RedirectRepository {
  list(siteId: string): Promise<RedirectRecord[]>;
  findById(siteId: string, id: string): Promise<RedirectRecord | null>;
  findByFrom(siteId: string, from: string): Promise<RedirectRecord | null>;
  create(input: SaveRedirectInput): Promise<RedirectRecord>;
  update(siteId: string, id: string, input: RedirectRule): Promise<RedirectRecord | null>;
  upsertByFrom(input: SaveRedirectInput): Promise<RedirectRecord>;
  delete(siteId: string, id: string): Promise<boolean>;
}
