import { PageSchema } from "@staark/core";

import {
  disconnectPrismaClient,
  getPrismaClient,
} from "../lib/db/prisma";
import { checksumPage } from "../lib/repositories/revision-checksum";
import { toPrismaJson } from "../lib/repositories/postgres/json";

async function main() {
  const prisma = getPrismaClient();

  const pages = await prisma.page.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      blocks: {
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: [
      {
        siteId: "asc",
      },
      {
        path: "asc",
      },
    ],
  });

  let created = 0;
  let skipped = 0;

  for (const row of pages) {
    const existing = await prisma.pagePublication.findUnique({
      where: {
        pageId: row.id,
      },
      select: {
        pageId: true,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

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

    await prisma.pagePublication.create({
      data: {
        pageId: row.id,
        siteId: row.siteId,
        path: page.path,
        snapshot: toPrismaJson(page),
        checksum: checksumPage(page),
        publishedAt: row.updatedAt,
      },
    });

    created += 1;

    console.log(
      `[publication-bootstrap] published ${row.siteId} ${page.path}`,
    );
  }

  console.log(
    `[publication-bootstrap] done created=${created} skipped=${skipped}`,
  );
}

main()
  .catch((error) => {
    console.error("[publication-bootstrap] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
