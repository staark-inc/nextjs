import type {
  ServiceCatalogRecord,
  ServiceCatalogRepository,
  UpsertServiceCatalogInput,
} from "../service-catalog-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

const select = {
  siteId: true,
  document: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ServiceCatalogRow = {
  siteId: string;
  document: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function documentObject(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapRecord(
  row: ServiceCatalogRow,
): ServiceCatalogRecord {
  return {
    siteId: row.siteId,
    document: documentObject(row.document),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresServiceCatalogRepository
implements ServiceCatalogRepository {
  constructor(
    private readonly db: RepositoryDbClient,
  ) {}

  async findBySiteId(
    siteId: string,
  ): Promise<ServiceCatalogRecord | null> {
    const row =
      await this.db.serviceCatalog.findUnique({
        where: { siteId },
        select,
      });

    return row
      ? mapRecord(row)
      : null;
  }

  async upsert(
    input: UpsertServiceCatalogInput,
  ): Promise<ServiceCatalogRecord> {
    const document =
      toPrismaJson(input.document);

    const row =
      await this.db.serviceCatalog.upsert({
        where: {
          siteId: input.siteId,
        },
        create: {
          siteId: input.siteId,
          document,
        },
        update: {
          document,
        },
        select,
      });

    return mapRecord(row);
  }
}
