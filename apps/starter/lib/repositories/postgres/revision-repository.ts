import { PageSchema } from "@staark/core";

import { checksumPage } from "../revision-checksum";
import {
  PAGE_REVISION_LIMIT,
  type CreatePageRevisionInput,
  type PageRevisionRecord,
  type RevisionRepository,
} from "../revision-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

type RevisionRow = {
  id: string;
  siteId: string;
  pageId: string;
  reason: string;
  checksum: string;
  snapshot: unknown;
  createdAt: Date;
};

function normalizeReason(value: string): string {
  return value.trim().slice(0, 80) || "save";
}

function normalizeChecksum(value: string): string {
  const checksum = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksum)) {
    throw new Error("Revision checksum must be a SHA-256 hex string.");
  }
  return checksum;
}

function mapRevision(row: RevisionRow): PageRevisionRecord {
  return {
    id: row.id,
    siteId: row.siteId,
    pageId: row.pageId,
    reason: row.reason,
    checksum: row.checksum,
    page: PageSchema.parse(row.snapshot),
    createdAt: row.createdAt.toISOString(),
  };
}

export class PostgresRevisionRepository implements RevisionRepository {
  constructor(private readonly db: RepositoryDbClient) {}

  async list(
    siteId: string,
    pageId: string,
    options: { limit?: number } = {},
  ): Promise<PageRevisionRecord[]> {
    const limit = Math.max(1, Math.min(options.limit ?? PAGE_REVISION_LIMIT, 250));
    const rows = await this.db.pageRevision.findMany({
      where: { siteId, pageId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(mapRevision);
  }

  async findById(
    siteId: string,
    pageId: string,
    revisionId: string,
  ): Promise<PageRevisionRecord | null> {
    const row = await this.db.pageRevision.findFirst({
      where: {
        id: revisionId,
        siteId,
        pageId,
      },
    });

    return row ? mapRevision(row) : null;
  }

  async create(input: CreatePageRevisionInput): Promise<PageRevisionRecord> {
    const page = PageSchema.parse(input.page);
    const checksum = normalizeChecksum(input.checksum ?? checksumPage(page));
    const reason = normalizeReason(input.reason);

    const latest = await this.db.pageRevision.findFirst({
      where: {
        siteId: input.siteId,
        pageId: input.pageId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (latest?.checksum === checksum) {
      return mapRevision(latest);
    }

    const row = await this.db.pageRevision.create({
      data: {
        siteId: input.siteId,
        pageId: input.pageId,
        reason,
        checksum,
        snapshot: toPrismaJson(page),
      },
    });

    const stale = await this.db.pageRevision.findMany({
      where: {
        siteId: input.siteId,
        pageId: input.pageId,
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      skip: PAGE_REVISION_LIMIT,
    });

    if (stale.length > 0) {
      await this.db.pageRevision.deleteMany({
        where: {
          siteId: input.siteId,
          pageId: input.pageId,
          id: { in: stale.map((revision: { id: string }) => revision.id) },
        },
      });
    }

    return mapRevision(row);
  }
}
