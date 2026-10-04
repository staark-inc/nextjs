import {
  normalizePath,
  PageSchema,
} from "@staark/core";

import { checksumPage } from "../revision-checksum";
import {
  type PagePublicationRecord,
  type PublicationRepository,
  type PublishPageInput,
} from "../publication-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

type PublicationRow = {
  pageId: string;
  siteId: string;
  path: string;
  snapshot: unknown;
  checksum: string;
  publishedAt: Date;
  updatedAt: Date;
};

function mapPublication(
  row: PublicationRow,
): PagePublicationRecord {
  return {
    pageId: row.pageId,
    siteId: row.siteId,
    path: row.path,
    page: PageSchema.parse(row.snapshot),
    checksum: row.checksum,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresPublicationRepository
  implements PublicationRepository
{
  constructor(private readonly db: RepositoryDbClient) {}

  async findByPageId(
    siteId: string,
    pageId: string,
  ): Promise<PagePublicationRecord | null> {
    const row = await this.db.pagePublication.findFirst({
      where: {
        siteId,
        pageId,
      },
    });

    return row ? mapPublication(row) : null;
  }

  async findByPath(
    siteId: string,
    path: string,
  ): Promise<PagePublicationRecord | null> {
    const row = await this.db.pagePublication.findUnique({
      where: {
        siteId_path: {
          siteId,
          path: normalizePath(path),
        },
      },
    });

    return row ? mapPublication(row) : null;
  }

  async list(
    siteId: string,
  ): Promise<PagePublicationRecord[]> {
    const rows = await this.db.pagePublication.findMany({
      where: {
        siteId,
      },
      orderBy: {
        path: "asc",
      },
    });

    return rows.map(mapPublication);
  }

  async publish(
    input: PublishPageInput,
  ): Promise<PagePublicationRecord> {
    const page = PageSchema.parse(input.page);
    const path = normalizePath(page.path);
    const checksum = checksumPage(page);
    const publishedAt = input.publishedAt ?? new Date();

    const row = await this.db.pagePublication.upsert({
      where: {
        pageId: input.pageId,
      },
      create: {
        pageId: input.pageId,
        siteId: input.siteId,
        path,
        snapshot: toPrismaJson(page),
        checksum,
        publishedAt,
      },
      update: {
        siteId: input.siteId,
        path,
        snapshot: toPrismaJson(page),
        checksum,
        publishedAt,
      },
    });

    return mapPublication(row);
  }
}
