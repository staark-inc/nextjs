import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __staarkPrisma?: PrismaClient;
};

function resolveDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL is required when PostgreSQL-backed repositories are used.",
    );
  }
  return value;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: resolveDatabaseUrl(),
  });

  return new PrismaClient({ adapter });
}

/**
 * Returns the process-wide Prisma client.
 *
 * The client is intentionally created lazily so the current filesystem/S3
 * runtime keeps working while Storage v2 is introduced incrementally.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__staarkPrisma) {
    globalForPrisma.__staarkPrisma = createPrismaClient();
  }

  return globalForPrisma.__staarkPrisma;
}
