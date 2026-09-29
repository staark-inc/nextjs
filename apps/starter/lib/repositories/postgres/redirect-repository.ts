import type { RedirectRule, RedirectSource, RedirectStatus } from "../../redirect-domain";
import type {
  RedirectRecord,
  RedirectRepository,
  SaveRedirectInput,
} from "../redirect-repository";
import type { RepositoryDbClient } from "./db-client";

const redirectSelect = {
  id: true,
  siteId: true,
  fromPath: true,
  to: true,
  status: true,
  enabled: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} as const;

type RedirectRow = {
  id: string;
  siteId: string;
  fromPath: string;
  to: string;
  status: number;
  enabled: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapRedirect(row: RedirectRow): RedirectRecord {
  if (row.status !== 301 && row.status !== 302) {
    throw new Error(`Unsupported redirect status in PostgreSQL: ${row.status}.`);
  }
  if (row.source !== "manual" && row.source !== "page-path-change") {
    throw new Error(`Unsupported redirect source in PostgreSQL: ${row.source}.`);
  }

  return {
    id: row.id,
    siteId: row.siteId,
    from: row.fromPath,
    to: row.to,
    status: row.status as RedirectStatus,
    enabled: row.enabled,
    source: row.source as RedirectSource,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createData(input: SaveRedirectInput) {
  return {
    id: input.id,
    siteId: input.siteId,
    fromPath: input.from,
    to: input.to,
    status: input.status,
    enabled: input.enabled,
    source: input.source,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
  };
}

function updateData(input: RedirectRule) {
  return {
    fromPath: input.from,
    to: input.to,
    status: input.status,
    enabled: input.enabled,
    source: input.source,
    updatedAt: new Date(input.updatedAt),
  };
}

export class PostgresRedirectRepository implements RedirectRepository {
  constructor(private readonly db: RepositoryDbClient) {}

  async list(siteId: string): Promise<RedirectRecord[]> {
    const rows = await this.db.redirect.findMany({
      where: { siteId },
      select: redirectSelect,
      orderBy: { fromPath: "asc" },
    });
    return rows.map(mapRedirect);
  }

  async findById(siteId: string, id: string): Promise<RedirectRecord | null> {
    const row = await this.db.redirect.findFirst({
      where: { siteId, id },
      select: redirectSelect,
    });
    return row ? mapRedirect(row) : null;
  }

  async findByFrom(siteId: string, from: string): Promise<RedirectRecord | null> {
    const row = await this.db.redirect.findUnique({
      where: {
        siteId_fromPath: {
          siteId,
          fromPath: from,
        },
      },
      select: redirectSelect,
    });
    return row ? mapRedirect(row) : null;
  }

  async create(input: SaveRedirectInput): Promise<RedirectRecord> {
    const row = await this.db.redirect.create({
      data: createData(input),
      select: redirectSelect,
    });
    return mapRedirect(row);
  }

  async update(
    siteId: string,
    id: string,
    input: RedirectRule,
  ): Promise<RedirectRecord | null> {
    const exists = await this.db.redirect.findFirst({
      where: { siteId, id },
      select: { id: true },
    });
    if (!exists) return null;

    const row = await this.db.redirect.update({
      where: { id },
      data: updateData(input),
      select: redirectSelect,
    });
    return mapRedirect(row);
  }

  async upsertByFrom(input: SaveRedirectInput): Promise<RedirectRecord> {
    const row = await this.db.redirect.upsert({
      where: {
        siteId_fromPath: {
          siteId: input.siteId,
          fromPath: input.from,
        },
      },
      create: createData(input),
      update: updateData(input),
      select: redirectSelect,
    });
    return mapRedirect(row);
  }

  async delete(siteId: string, id: string): Promise<boolean> {
    const result = await this.db.redirect.deleteMany({
      where: { siteId, id },
    });
    return result.count > 0;
  }
}
