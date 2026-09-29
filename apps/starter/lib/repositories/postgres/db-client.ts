import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Narrow database capability used by repositories.
 *
 * Prisma transaction clients expose the same model delegates, so this shape
 * works for both the process-wide PrismaClient and an interactive transaction
 * without leaking Prisma types into repository contracts.
 */
export type RepositoryDbClient = Pick<
  PrismaClient,
  "site" | "page" | "pageRevision" | "redirect"
>;
