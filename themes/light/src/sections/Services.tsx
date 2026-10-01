import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import {
  Container,
  Eyebrow,
  optionalLinkSchema,
} from "../components/primitives";

const serviceItemSchema =
  z.object({
    title:
      z.string(),

    description:
      z.string().optional(),

    icon:
      z.string().optional(),

    price:
      z.string().optional(),

    duration:
      z.string().optional(),

    bookable:
      z.boolean().optional(),

    features:
      z.array(
        z.string(),
      ).default([]),

    cta:
      optionalLinkSchema,
  });

const serviceGroupSchema =
  z.object({
    id:
      z.string().optional(),

    title:
      z.string(),

    description:
      z.string().optional(),

    items:
      z.array(
        serviceItemSchema,
      ).default([]),
  });

const schema =
  z.object({
    eyebrow:
      z.string().optional(),

    heading:
      z.string(),

    intro:
      z.string().optional(),

    items:
      z.array(
        serviceItemSchema,
      ).default([]),

    groups:
      z.array(
        serviceGroupSchema,
      ).default([]),

    columns:
      z.union([
        z.literal(2),
        z.literal(3),
        z.literal(4),
      ]).default(3),
  });

type ServiceItem =
  z.infer<
    typeof serviceItemSchema
  >;

function iconIsImage(
  value: string,
): boolean {
  return /^(?:https?:\/\/|\/)/i.test(
    value,
  );
}

function formatDuration(
  value:
    string | undefined,
): string {
  const duration =
    value?.trim() ?? "";

  if (!duration) {
    return "";
  }

  if (
    /^\d+(?:[.,]\d+)?$/.test(
      duration,
    )
  ) {
    return `${duration} min`;
  }

  return duration;
}

function ServiceCard({
  item,
  cards,
}: {
  item:
    ServiceItem;
  cards:
    string;
}) {
  return (
    <article
      className={
        `sk-card sk-card--${cards} sk-service-card`
      }
    >
      {item.icon ? (
        <div
          className="sk-card__icon"
          aria-hidden
        >
          {iconIsImage(
            item.icon,
          ) ? (
            <img
              src={item.icon}
              alt=""
            />
          ) : (
            item.icon
          )}
        </div>
      ) : null}

      <div className="sk-service-card__top">
        <h3>
          {item.title}
        </h3>

        {item.price ? (
          <p className="sk-service-card__price">
            {item.price}
          </p>
        ) : null}
      </div>

      {item.description ? (
        <p className="sk-service-card__description">
          {item.description}
        </p>
      ) : null}

      {item.duration ? (
        <div className="sk-service-card__meta">
          <span className="sk-service-card__duration">
            <span aria-hidden>
              ◷
            </span>

            {formatDuration(
              item.duration,
            )}
          </span>
        </div>
      ) : null}

      {item.features.length ? (
        <ul className="sk-service-card__features">
          {item.features.map(
            (
              feature,
              index,
            ) => (
              <li
                key={
                  `${feature}-${index}`
                }
              >
                {feature}
              </li>
            ),
          )}
        </ul>
      ) : null}

      {item.cta?.label &&
      item.cta.href ? (
        <a
          className="sk-service-card__link"
          href={
            item.cta.href
          }
        >
          {item.cta.label}
          {" "}
          <span aria-hidden>
            →
          </span>
        </a>
      ) : item.bookable ? (
        <a
          className="sk-service-card__link"
          href="/boka"
        >
          Boka tid
          {" "}
          <span aria-hidden>
            →
          </span>
        </a>
      ) : null}
    </article>
  );
}

export const Services:
SectionComponent<
  z.infer<typeof schema>
> = ({
  props,
  ctx,
}) => {
  const p =
    schema.parse(
      props,
    );

  const cards =
    ctx.components.cards ??
    "soft";

  return (
    <section className="sk-section">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? (
            <Eyebrow>
              {p.eyebrow}
            </Eyebrow>
          ) : null}

          <h2>
            {p.heading}
          </h2>

          {p.intro ? (
            <p className="sk-section__intro">
              {p.intro}
            </p>
          ) : null}
        </header>

        {p.groups.length ? (
          <div className="sk-service-groups">
            {p.groups.map(
              (
                group,
                groupIndex,
              ) => (
                <div
                  className="sk-service-group"
                  key={
                    group.id ??
                    `${group.title}-${groupIndex}`
                  }
                >
                  <header className="sk-service-group__head">
                    <div>
                      <p className="sk-service-group__label">
                        Tjänster
                      </p>

                      <h3 className="sk-service-group__title">
                        {group.title}
                      </h3>

                      {group.description ? (
                        <p className="sk-service-group__description">
                          {group.description}
                        </p>
                      ) : null}
                    </div>

                    <span className="sk-service-group__count">
                      {group.items.length}
                    </span>
                  </header>

                  <div
                    className={
                      `sk-grid sk-grid--${p.columns}`
                    }
                  >
                    {group.items.map(
                      (
                        item,
                        itemIndex,
                      ) => (
                        <ServiceCard
                          key={
                            `${item.title}-${itemIndex}`
                          }
                          item={
                            item
                          }
                          cards={
                            cards
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              `sk-grid sk-grid--${p.columns}`
            }
          >
            {p.items.map(
              (
                item,
                index,
              ) => (
                <ServiceCard
                  key={
                    `${item.title}-${index}`
                  }
                  item={
                    item
                  }
                  cards={
                    cards
                  }
                />
              ),
            )}
          </div>
        )}
      </Container>
    </section>
  );
};
