export type ServiceCatalogRecord = {
  siteId: string;
  document: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UpsertServiceCatalogInput = {
  siteId: string;
  document: Record<string, unknown>;
};

export interface ServiceCatalogRepository {
  findBySiteId(
    siteId: string,
  ): Promise<ServiceCatalogRecord | null>;

  upsert(
    input: UpsertServiceCatalogInput,
  ): Promise<ServiceCatalogRecord>;
}
