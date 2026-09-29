import {
  contentStoragePath,
  listContent,
  readContentJson,
  writeContentJson,
} from "./storage";

export const SALON_SERVICE_CATALOG_FILE =
  "services.json";

export const SALON_SERVICE_CATALOG_SCHEMA =
  "staark-salon-services/v1" as const;

export type SalonCatalogService = {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bookable: boolean;
};

export type SalonCatalogCategory = {
  id: string;
  name: string;
  description: string;
  services: SalonCatalogService[];
};

export type SalonServiceCatalog = {
  schema:
    typeof SALON_SERVICE_CATALOG_SCHEMA;
  version: 1;
  heading: string;
  intro: string;
  categories: SalonCatalogCategory[];
  updatedAt: string;
};

type Obj =
  Record<string, unknown>;

function object(
  value: unknown,
): Obj {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Obj
    : {};
}

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function key(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase("sv-SE");
}

export function serviceCatalogId(
  value: string,
  fallback = "item",
): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || fallback;
}

function uniqueId(
  preferred: string,
  used: Set<string>,
): string {
  const base =
    serviceCatalogId(preferred);

  let id = base;
  let index = 2;

  while (used.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  used.add(id);

  return id;
}

export function normalizeSekPrice(
  value: string,
): string {
  const raw = value.trim();

  if (!raw) {
    return "";
  }

  const numeric = raw
    .replace(/^från\s+/i, "")
    .replace(/\s*kr$/i, "")
    .replace(/\s+/g, "")
    .replace(",", ".");

  // Keep things such as "Offert".
  if (!/^\d+(?:\.\d+)?$/.test(numeric)) {
    return raw;
  }

  const amount =
    Number(numeric);

  if (!Number.isFinite(amount)) {
    return raw;
  }

  const formatted =
    new Intl.NumberFormat(
      "sv-SE",
      {
        maximumFractionDigits: 2,
      },
    ).format(amount);

  return `från ${formatted} kr`;
}

function normalizeCatalog(
  value: unknown,
): SalonServiceCatalog {
  const raw =
    object(value);

  const rawCategories =
    Array.isArray(raw.categories)
      ? raw.categories
      : [];

  const usedCategoryIds =
    new Set<string>();

  const usedServiceIds =
    new Set<string>();

  const categories =
    rawCategories.map(
      (
        categoryValue,
        categoryIndex,
      ) => {
        const category =
          object(categoryValue);

        const name =
          text(category.name) ||
          `Kategori ${categoryIndex + 1}`;

        const categoryId =
          uniqueId(
            text(category.id) ||
              name,
            usedCategoryIds,
          );

        const rawServices =
          Array.isArray(
            category.services,
          )
            ? category.services
            : [];

        const services =
          rawServices.map(
            (
              serviceValue,
              serviceIndex,
            ) => {
              const service =
                object(serviceValue);

              const serviceName =
                text(service.name) ||
                `Tjänst ${serviceIndex + 1}`;

              return {
                id: uniqueId(
                  text(service.id) ||
                    serviceName,
                  usedServiceIds,
                ),

                name:
                  serviceName,

                description:
                  text(
                    service.description,
                  ),

                duration:
                  text(
                    service.duration,
                  ),

                price:
                  normalizeSekPrice(
                    text(
                      service.price,
                    ),
                  ),

                bookable:
                  typeof service.bookable ===
                  "boolean"
                    ? service.bookable
                    : true,
              };
            },
          );

        return {
          id:
            categoryId,

          name,

          description:
            text(
              category.description,
            ),

          services,
        };
      },
    );

  return {
    schema:
      SALON_SERVICE_CATALOG_SCHEMA,

    version: 1,

    heading:
      text(raw.heading) ||
      "Meny & priser",

    intro:
      text(raw.intro),

    categories,

    updatedAt:
      text(raw.updatedAt) ||
      new Date().toISOString(),
  };
}

export async function readSalonServiceCatalog():
Promise<SalonServiceCatalog | null> {
  const raw =
    await readContentJson<unknown>(
      SALON_SERVICE_CATALOG_FILE,
    );

  return raw
    ? normalizeCatalog(raw)
    : null;
}

export async function writeSalonServiceCatalog(
  input: SalonServiceCatalog,
): Promise<SalonServiceCatalog> {
  const catalog =
    normalizeCatalog({
      ...input,
      schema:
        SALON_SERVICE_CATALOG_SCHEMA,
      version: 1,
      updatedAt:
        new Date().toISOString(),
    });

  await writeContentJson(
    SALON_SERVICE_CATALOG_FILE,
    catalog,
  );

  return catalog;
}

async function pageFiles():
Promise<string[]> {
  const prefix =
    `${contentStoragePath("pages")}/`;

  return (
    await listContent("pages")
  )
    .map((entry) =>
      entry.path.startsWith(prefix)
        ? entry.path.slice(
            prefix.length,
          )
        : "",
    )
    .filter(
      (file) =>
        Boolean(file) &&
        !file.includes("/") &&
        file.endsWith(".json"),
    )
    .map(
      (file) =>
        `pages/${file}`,
    );
}

function blocks(
  page: Obj,
): Obj[] {
  return Array.isArray(page.blocks)
    ? page.blocks
        .filter(
          (
            value,
          ): value is Obj =>
            Boolean(value) &&
            typeof value ===
              "object" &&
            !Array.isArray(value),
        )
    : [];
}

/**
 * One-time migration for an existing Salon.
 *
 * Priority:
 * 1. serviceMenu = detailed source
 * 2. /behandlingar services = recover missing services
 * 3. bookingRequest = recover orphan booking options
 */
export async function migrateSalonServiceCatalog():
Promise<SalonServiceCatalog> {
  const existing =
    await readSalonServiceCatalog();

  if (existing) {
    return existing;
  }

  const files =
    await pageFiles();

  const pages: Obj[] = [];

  for (const file of files) {
    const page =
      await readContentJson<Obj>(
        file,
      );

    if (page) {
      pages.push(page);
    }
  }

  let heading =
    "Meny & priser";

  let intro =
    "";

  const categories:
    SalonCatalogCategory[] = [];

  const usedCategoryIds =
    new Set<string>();

  const usedServiceIds =
    new Set<string>();

  const findCategory = (
    name: string,
  ) =>
    categories.find(
      (category) =>
        key(category.name) ===
        key(name),
    );

  const getCategory = (
    name: string,
    description = "",
  ) => {
    const normalizedName =
      name.trim() ||
      "Behandlingar";

    const existingCategory =
      findCategory(
        normalizedName,
      );

    if (existingCategory) {
      if (
        !existingCategory.description &&
        description
      ) {
        existingCategory.description =
          description;
      }

      return existingCategory;
    }

    const category:
      SalonCatalogCategory = {
      id:
        uniqueId(
          normalizedName,
          usedCategoryIds,
        ),

      name:
        normalizedName,

      description:
        description.trim(),

      services: [],
    };

    categories.push(category);

    return category;
  };

  const findService = (
    name: string,
  ): SalonCatalogService | null => {
    const normalized =
      key(name);

    for (
      const category
      of categories
    ) {
      const found =
        category.services.find(
          (service) =>
            key(service.name) ===
            normalized,
        );

      if (found) {
        return found;
      }
    }

    return null;
  };

  const addService = (
    category:
      SalonCatalogCategory,
    input: {
      name: string;
      description?: string;
      duration?: string;
      price?: string;
      bookable?: boolean;
    },
  ) => {
    const name =
      input.name.trim();

    if (!name) {
      return;
    }

    const existingService =
      findService(name);

    if (existingService) {
      if (
        !existingService.description &&
        input.description
      ) {
        existingService.description =
          input.description.trim();
      }

      if (
        !existingService.duration &&
        input.duration
      ) {
        existingService.duration =
          input.duration.trim();
      }

      if (
        !existingService.price &&
        input.price
      ) {
        existingService.price =
          normalizeSekPrice(
            input.price,
          );
      }

      return;
    }

    category.services.push({
      id:
        uniqueId(
          name,
          usedServiceIds,
        ),

      name,

      description:
        input.description?.trim() ??
        "",

      duration:
        input.duration?.trim() ??
        "",

      price:
        normalizeSekPrice(
          input.price ?? "",
        ),

      bookable:
        input.bookable ??
        true,
    });
  };


  /* --------------------------------------------------------
   * 1. Detailed Skönhet serviceMenu
   * ------------------------------------------------------ */

  for (const page of pages) {
    for (
      const block
      of blocks(page)
    ) {
      if (
        block.type !==
        "serviceMenu"
      ) {
        continue;
      }

      const props =
        object(block.props);

      heading =
        text(props.heading) ||
        heading;

      intro =
        text(props.intro) ||
        intro;

      const menuCategories =
        Array.isArray(
          props.categories,
        )
          ? props.categories
          : [];

      for (
        const categoryValue
        of menuCategories
      ) {
        const rawCategory =
          object(categoryValue);

        const category =
          getCategory(
            text(rawCategory.name) ||
              text(rawCategory.title) ||
              "Behandlingar",

            text(
              rawCategory.note,
            ) ||
              text(
                rawCategory.description,
              ),
          );

        const items =
          Array.isArray(
            rawCategory.items,
          )
            ? rawCategory.items
            : [];

        for (
          const itemValue
          of items
        ) {
          const item =
            object(itemValue);

          addService(
            category,
            {
              name:
                text(item.name),

              description:
                text(
                  item.description,
                ),

              duration:
                text(
                  item.duration,
                ),

              price:
                text(item.price),

              // All menu items stay in
              // the catalog. Only booking
              // filters on this flag.
              bookable:
                typeof item.bookable ===
                "boolean"
                  ? item.bookable
                  : true,
            },
          );
        }
      }
    }
  }


  /* --------------------------------------------------------
   * 2. Recover services visible on /behandlingar
   * ------------------------------------------------------ */

  for (const page of pages) {
    if (
      text(page.path) !==
      "/behandlingar"
    ) {
      continue;
    }

    for (
      const block
      of blocks(page)
    ) {
      if (
        block.type !==
        "services"
      ) {
        continue;
      }

      const props =
        object(block.props);

      const items =
        Array.isArray(
          props.items,
        )
          ? props.items
          : [];

      const fallbackCategory =
        getCategory(
          "Behandlingar",
        );

      for (
        const itemValue
        of items
      ) {
        const item =
          object(itemValue);

        addService(
          fallbackCategory,
          {
            name:
              text(item.title) ||
              text(item.name),

            description:
              text(
                item.description,
              ),

            price:
              text(
                item.price,
              ),

            bookable:
              true,
          },
        );
      }
    }
  }


  /* --------------------------------------------------------
   * 3. Recover orphan options from existing booking forms
   * ------------------------------------------------------ */

  for (const page of pages) {
    for (
      const block
      of blocks(page)
    ) {
      if (
        block.type !==
        "bookingRequest"
      ) {
        continue;
      }

      const props =
        object(block.props);

      const services =
        Array.isArray(
          props.services,
        )
          ? props.services
          : [];

      for (
        const value
        of services
      ) {
        const name =
          text(value);

        if (
          !name ||
          findService(name)
        ) {
          continue;
        }

        const category =
          getCategory(
            "Övrigt",
          );

        addService(
          category,
          {
            name,
            bookable:
              true,
          },
        );
      }
    }
  }

  const catalog:
    SalonServiceCatalog = {
    schema:
      SALON_SERVICE_CATALOG_SCHEMA,

    version: 1,

    heading,

    intro,

    categories,

    updatedAt:
      new Date().toISOString(),
  };

  return writeSalonServiceCatalog(
    catalog,
  );
}
