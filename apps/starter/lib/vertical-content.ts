import {
  migrateSalonServiceCatalog,
  readSalonServiceCatalog,
  type SalonCatalogCategory,
  type SalonServiceCatalog,
} from "./salon-service-catalog";

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
    ? value
    : "";
}

function isSalon(
  site: {
    websiteType?: string;
    theme?: {
      family?: string;
    };
  },
): boolean {
  return (
    site.websiteType ===
      "salon" ||
    site.theme?.family ===
      "salong" ||
    site.theme?.family ===
      "skonhet"
  );
}

function serviceMenuCategories(
  catalog:
    SalonServiceCatalog,
) {
  return catalog.categories.map(
    (category) => ({
      name:
        category.name,

      note:
        category.description ||
        undefined,

      items:
        category.services.map(
          (service) => ({
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
  );
}

function genericServiceItems(
  catalog:
    SalonServiceCatalog,
  existingItems:
    unknown,
) {
  const existing =
    Array.isArray(existingItems)
      ? existingItems
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

  const existingByTitle =
    new Map(
      existing.map(
        (item) => [
          text(item.title)
            .trim()
            .toLocaleLowerCase("sv-SE"),
          item,
        ],
      ),
    );

  return catalog.categories.flatMap(
    (category) =>
      category.services.map(
        (service) => {
          const previous =
            existingByTitle.get(
              service.name
                .trim()
                .toLocaleLowerCase("sv-SE"),
            );

          return {
            ...(previous ?? {}),

            title:
              service.name,

            description:
              service.description,

            price:
              service.price,

            duration:
              service.duration,

            bookable:
              service.bookable,

            // Presentation-only values stay owned by the page block.
            // Duration is domain data and must not masquerade as a feature.
            features:
              Array.isArray(
                previous?.features,
              )
                ? previous.features
                : [],
          };
        },
      ),
  );
}


function genericServiceGroups(
  catalog:
    SalonServiceCatalog,
  existingItems:
    unknown,
) {
  return catalog.categories
    .filter(
      (category) =>
        category.services.length > 0,
    )
    .map(
      (category) => ({
        id:
          category.id,

        title:
          category.name,

        description:
          category.description,

        items:
          genericServiceItems(
            {
              ...catalog,
              categories: [
                category,
              ],
            },
            existingItems,
          ),
      }),
    );
}


function bookingServices(
  catalog:
    SalonServiceCatalog,
): string[] {
  return catalog.categories.flatMap(
    (category) =>
      category.services
        .filter(
          (service) =>
            service.bookable,
        )
        .map(
          (service) =>
            service.name,
        ),
  );
}

function hydrateSalonBlocks(
  pagePath: string,
  rawBlocks: unknown[],
  catalog:
    SalonServiceCatalog,
): Obj[] {
  const blocks =
    rawBlocks.filter(
      (
        value,
      ): value is Obj =>
        Boolean(value) &&
        typeof value ===
          "object" &&
        !Array.isArray(value),
    );

  return blocks.flatMap(
    (block) => {
      const type =
        text(block.type);

      const props =
        object(block.props);


      /* -----------------------------------------------
       * /priser → detailed category/service menu
       * --------------------------------------------- */

      if (
        type ===
        "serviceMenu"
      ) {
        return [{
          ...block,

          props: {
            ...props,

            heading:
              catalog.heading ||
              props.heading,

            intro:
              catalog.intro ||
              props.intro,

            categories:
              serviceMenuCategories(
                catalog,
              ),
          },
        }];
      }


      /* -----------------------------------------------
       * Generic Services block
       *
       * Salon service data comes from the shared catalog while
       * the block keeps presentation settings such as heading,
       * intro, columns, icons and CTAs.
       * --------------------------------------------- */

      if (
        type ===
        "services"
      ) {
        return [{
          ...block,

          props: {
            ...props,

            items:
              genericServiceItems(
                catalog,
                props.items,
              ),

            groups:
              genericServiceGroups(
                catalog,
                props.items,
              ),
          },
        }];
      }


      /* -----------------------------------------------
       * Any Skönhet booking request
       * --------------------------------------------- */

      if (
        type ===
        "bookingRequest"
      ) {
        return [{
          ...block,

          props: {
            ...props,

            services:
              bookingServices(
                catalog,
              ),
          },
        }];
      }


      /* -----------------------------------------------
       * Skönhet treatment catalog
       *
       * The block identity is native to the theme. Runtime hydration only
       * injects business data; it never converts a generic Light block into
       * a theme-specific block.
       * --------------------------------------------- */

      if (type === "treatmentCatalog") {
        return [{
          ...block,

          props: {
            ...props,

            categories:
              catalog.categories
                .filter((category) => category.services.length > 0)
                .map((category) => ({
                  id: category.id,
                  name: category.name,
                  description: category.description,

                  services:
                    category.services.map((service) => ({
                      id: service.id,
                      name: service.name,
                      description: service.description,
                      duration: service.duration,
                      price: service.price,
                      bookable: service.bookable,
                    })),
                })),
          },
        }];
      }

      return [block];
    },
  );
}

export async function hydrateVerticalPage<
  TSite extends {
    websiteType?: string;
    theme?: {
      family?: string;
    };
  },
  TPage extends {
    path?: string;
    blocks?: unknown[];
  },
>(
  site: TSite,
  page: TPage,
): Promise<TPage> {
  if (
    !isSalon(site) ||
    !Array.isArray(
      page.blocks,
    )
  ) {
    return page;
  }

  const catalog =
    (await readSalonServiceCatalog()) ??
    (await migrateSalonServiceCatalog());

  return {
    ...page,

    blocks:
      hydrateSalonBlocks(
        page.path ?? "",
        page.blocks,
        catalog,
      ),
  } as TPage;
}
