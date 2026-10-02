import { normalizePath, PageSchema } from "@staark/core";
import type { Page } from "@staark/core";

import type {
  PageReadOptions,
  PageRecord,
  PageRepository,
} from "../page-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

type PageRow = {
  id: string;
  siteId: string;
  path: string;
  title: string;
  seo: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedContext: unknown;
  blocks: Array<{
    id: string;
    type: string;
    position: number;
    props: unknown;
  }>;
};

const orderedBlocks = {
  orderBy: { position: "asc" as const },
};

function mapPage(row: PageRow): PageRecord {
  const page = PageSchema.parse({
    path: row.path,
    title: row.title,
    seo: row.seo,
    blocks: row.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      props: block.props,
    })),
    updatedAt: row.updatedAt.toISOString(),
  });

  return {
    id: row.id,
    siteId: row.siteId,
    page,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deletedContext: row.deletedContext,
  };
}

function normalizePage(input: Page): Page {
  return PageSchema.parse({
    ...input,
    path: normalizePath(input.path),
  });
}

function blockCreates(page: Page) {
  return page.blocks.map((block, position) => ({
    id: block.id,
    type: block.type,
    position,
    props: toPrismaJson(block.props),
  }));
}

export class PostgresPageRepository implements PageRepository {
  constructor(private readonly db: RepositoryDbClient) {}

  private async syncPagesCount(siteId: string): Promise<void> {
    const pagesCount = await this.db.page.count({
      where: {
        siteId,
        deletedAt: null,
      },
    });

    await this.db.siteUsage.upsert({
      where: { siteId },
      create: {
        siteId,
        pagesCount,
      },
      update: {
        pagesCount,
      },
    });
  }

  async list(
    siteId: string,
    options: PageReadOptions = {},
  ): Promise<PageRecord[]> {
    const rows = await this.db.page.findMany({
      where: {
        siteId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      include: { blocks: orderedBlocks },
      orderBy: { path: "asc" },
    });

    return rows.map(mapPage);
  }

  async findById(
    siteId: string,
    pageId: string,
    options: PageReadOptions = {},
  ): Promise<PageRecord | null> {
    const row = await this.db.page.findFirst({
      where: {
        id: pageId,
        siteId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      include: { blocks: orderedBlocks },
    });

    return row ? mapPage(row) : null;
  }

  async findByPath(
    siteId: string,
    path: string,
    options: PageReadOptions = {},
  ): Promise<PageRecord | null> {
    const row = await this.db.page.findFirst({
      where: {
        siteId,
        path: normalizePath(path),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      include: { blocks: orderedBlocks },
    });

    return row ? mapPage(row) : null;
  }

  async upsertByPath(siteId: string, input: Page): Promise<PageRecord> {
    const page = normalizePage(input);
    const row = await this.db.page.upsert({
      where: {
        siteId_path: {
          siteId,
          path: page.path,
        },
      },
      create: {
        site: { connect: { id: siteId } },
        path: page.path,
        title: page.title,
        seo: toPrismaJson(page.seo),
        blocks: {
          create: blockCreates(page),
        },
      },
      update: {
        title: page.title,
        seo: toPrismaJson(page.seo),
        deletedAt: null,
        deletedContext: toPrismaJson({}),
        blocks: {
          deleteMany: {},
          create: blockCreates(page),
        },
      },
      include: { blocks: orderedBlocks },
    });

    await this.syncPagesCount(siteId);

    return mapPage(row);
  }

  async replace(
    siteId: string,
    pageId: string,
    input: Page,
  ): Promise<PageRecord | null> {
    const existing = await this.db.page.findFirst({
      where: { id: pageId, siteId },
      select: { id: true },
    });
    if (!existing) return null;

    const page = normalizePage(input);
    const row = await this.db.page.update({
      where: { id: pageId },
      data: {
        path: page.path,
        title: page.title,
        seo: toPrismaJson(page.seo),
        deletedAt: null,
        deletedContext: toPrismaJson({}),
        blocks: {
          deleteMany: {},
          create: blockCreates(page),
        },
      },
      include: { blocks: orderedBlocks },
    });

    await this.syncPagesCount(siteId);

    return mapPage(row);
  }

  async softDelete(
    siteId: string,
    pageId: string,
    deletedAt = new Date(),
    deletedContext: unknown = {},
  ): Promise<PageRecord | null> {
    const existing = await this.db.page.findFirst({
      where: { id: pageId, siteId },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await this.db.page.update({
      where: { id: pageId },
      data: {
        deletedAt,
        deletedContext: toPrismaJson(deletedContext),
      },
      include: { blocks: orderedBlocks },
    });

    await this.syncPagesCount(siteId);

    return mapPage(row);
  }
}
