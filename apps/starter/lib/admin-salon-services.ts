import {
  migrateSalonServiceCatalog,
  normalizeSekPrice,
  readSalonServiceCatalog,
  serviceCatalogId,
  writeSalonServiceCatalog,
  type SalonCatalogCategory,
  type SalonCatalogService,
  type SalonServiceCatalog,
} from "./salon-service-catalog";

export type SalonService = {
  id?: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bookable?: boolean;
};

export type SalonServiceGroup = {
  id?: string;
  title: string;
  description?: string;
  items: SalonService[];
};

export type SalonServicesDocument = {
  pageFile: string;
  pagePath: string;
  heading: string;
  intro: string;
  groups: SalonServiceGroup[];
};

function key(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase("sv-SE");
}

async function catalog():
Promise<SalonServiceCatalog> {
  return (
    await readSalonServiceCatalog()
  ) ??
    migrateSalonServiceCatalog();
}

function toDocument(
  source: SalonServiceCatalog,
): SalonServicesDocument {
  return {
    // Kept for backwards compatibility
    // with the current admin page.
    pageFile:
      "services.json",

    pagePath:
      "/priser",

    heading:
      source.heading,

    intro:
      source.intro,

    groups:
      source.categories.map(
        (category) => ({
          id:
            category.id,

          title:
            category.name,

          description:
            category.description,

          items:
            category.services.map(
              (service) => ({
                id:
                  service.id,

                name:
                  service.name,

                description:
                  service.description,

                duration:
                  service.duration,

                price:
                  service.price,

                bookable:
                  service.bookable,
              }),
            ),
        }),
      ),
  };
}

export async function readSalonServices():
Promise<SalonServicesDocument> {
  return toDocument(
    await catalog(),
  );
}

function findCategory(
  current:
    SalonServiceCatalog,
  group:
    SalonServiceGroup,
  index:
    number,
): SalonCatalogCategory | undefined {
  if (group.id) {
    const byId =
      current.categories.find(
        (category) =>
          category.id ===
          group.id,
      );

    if (byId) {
      return byId;
    }
  }

  const byName =
    current.categories.find(
      (category) =>
        key(category.name) ===
        key(group.title),
    );

  return (
    byName ??
    current.categories[index]
  );
}

function findService(
  currentCategory:
    SalonCatalogCategory | undefined,
  service:
    SalonService,
  index:
    number,
): SalonCatalogService | undefined {
  if (!currentCategory) {
    return undefined;
  }

  if (service.id) {
    const byId =
      currentCategory.services.find(
        (item) =>
          item.id ===
          service.id,
      );

    if (byId) {
      return byId;
    }
  }

  const byName =
    currentCategory.services.find(
      (item) =>
        key(item.name) ===
        key(service.name),
    );

  return (
    byName ??
    currentCategory.services[index]
  );
}

function uniqueId(
  preferred: string,
  used: Set<string>,
): string {
  const base =
    serviceCatalogId(
      preferred,
    );

  let id =
    base;

  let index =
    2;

  while (
    used.has(id)
  ) {
    id =
      `${base}-${index}`;

    index +=
      1;
  }

  used.add(id);

  return id;
}

export async function writeSalonServices(
  input:
    SalonServicesDocument,
): Promise<SalonServicesDocument> {
  const current =
    await catalog();

  const usedCategoryIds =
    new Set<string>();

  const usedServiceIds =
    new Set<string>();

  const categories =
    input.groups
      .map(
        (
          group,
          groupIndex,
        ) => {
          const title =
            group.title.trim();

          const currentCategory =
            findCategory(
              current,
              group,
              groupIndex,
            );

          const categoryId =
            uniqueId(
              group.id ||
                currentCategory?.id ||
                title ||
                `category-${groupIndex + 1}`,
              usedCategoryIds,
            );

          const services =
            group.items
              .map(
                (
                  service,
                  serviceIndex,
                ) => {
                  const name =
                    service.name.trim();

                  if (!name) {
                    return null;
                  }

                  const currentService =
                    findService(
                      currentCategory,
                      service,
                      serviceIndex,
                    );

                  const serviceId =
                    uniqueId(
                      service.id ||
                        currentService?.id ||
                        name ||
                        `service-${serviceIndex + 1}`,
                      usedServiceIds,
                    );

                  return {
                    id:
                      serviceId,

                    name,

                    description:
                      service.description.trim(),

                    duration:
                      service.duration.trim(),

                    price:
                      normalizeSekPrice(
                        service.price,
                      ),

                    // The current UI does not
                    // need to know about this
                    // yet. Preserve existing
                    // values, new services are
                    // bookable by default.
                    bookable:
                      typeof service.bookable ===
                      "boolean"
                        ? service.bookable
                        : currentService?.bookable ??
                          true,
                  } satisfies
                    SalonCatalogService;
                },
              )
              .filter(
                (
                  service,
                ): service is
                  SalonCatalogService =>
                    service !==
                    null,
              );

          return {
            id:
              categoryId,

            name:
              title ||
              currentCategory?.name ||
              `Kategori ${groupIndex + 1}`,

            description:
              group.description?.trim() ??
              currentCategory?.description ??
              "",

            services,
          } satisfies
            SalonCatalogCategory;
        },
      );

  const saved =
    await writeSalonServiceCatalog({
      ...current,

      heading:
        input.heading.trim() ||
        current.heading ||
        "Meny & priser",

      intro:
        input.intro.trim(),

      categories,

      updatedAt:
        new Date().toISOString(),
    });

  return toDocument(
    saved,
  );
}
