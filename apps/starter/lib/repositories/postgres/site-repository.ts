import { SiteSettingsSchema } from "@staark/core";

import type {
  SiteRecord,
  SiteRepository,
  UpsertSiteInput,
} from "../site-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

type SiteRow = {
  id: string;
  key: string;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeKey(value: string): string {
  const key = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-_]{0,99}$/.test(key)) {
    throw new Error(
      "Site key must be 1-100 lowercase letters, numbers, dashes or underscores.",
    );
  }
  return key;
}

function mapSite(row: SiteRow): SiteRecord {
  return {
    id: row.id,
    key: row.key,
    settings: SiteSettingsSchema.parse(row.settings),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresSiteRepository implements SiteRepository {
  constructor(private readonly db: RepositoryDbClient) {}

  async findById(siteId: string): Promise<SiteRecord | null> {
    const row = await this.db.site.findUnique({
      where: { id: siteId },
    });

    return row ? mapSite(row) : null;
  }

  async findByKey(key: string): Promise<SiteRecord | null> {
    const row = await this.db.site.findUnique({
      where: { key: normalizeKey(key) },
    });

    return row ? mapSite(row) : null;
  }

  async upsertByKey(input: UpsertSiteInput): Promise<SiteRecord> {
    const settings = SiteSettingsSchema.parse(input.settings);
    const key = normalizeKey(input.key);

    const row = await this.db.site.upsert({
      where: { key },
      create: {
        key,
        name: settings.name,
        settings: toPrismaJson(settings),
      },
      update: {
        name: settings.name,
        settings: toPrismaJson(settings),
      },
    });

    return mapSite(row);
  }
}
