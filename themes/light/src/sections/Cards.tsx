import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow, optionalLinkSchema } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  columns: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .default(3),
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        image: z
          .object({
            src: z.string(),
            alt: z.string().optional(),
          })
          .optional(),
        features: z.array(z.string()).default([]),
        cta: optionalLinkSchema,
      }),
    )
    .default([]),
});

function iconIsImage(value: string): boolean {
  return /^(?:https?:\/\/|\/)/i.test(value);
}

export const Cards: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const cards = ctx.components.cards ?? "soft";
  const hasHeading = Boolean(p.eyebrow || p.heading || p.intro);

  return (
    <section className="sk-section sk-cards-section">
      <Container>
        {hasHeading ? (
          <header className="sk-section__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            {p.heading ? <h2>{p.heading}</h2> : null}
            {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
          </header>
        ) : null}

        <div className={`sk-grid sk-grid--${p.columns}`}>
          {p.items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className={`sk-card sk-card--${cards} sk-content-card`}
            >
              {item.image ? (
                <img
                  className="sk-content-card__image"
                  src={item.image.src}
                  alt={item.image.alt ?? ""}
                />
              ) : null}
              {item.icon ? (
                <div className="sk-card__icon" aria-hidden>
                  {iconIsImage(item.icon) ? <img src={item.icon} alt="" /> : item.icon}
                </div>
              ) : null}
              <h3>{item.title}</h3>
              {item.description ? <p className="sk-content-card__description">{item.description}</p> : null}
              {item.features.length ? (
                <ul className="sk-content-card__features">
                  {item.features.map((feature, featureIndex) => (
                    <li key={`${feature}-${featureIndex}`}>{feature}</li>
                  ))}
                </ul>
              ) : null}
              {item.cta?.label && item.cta.href ? (
                <a className="sk-content-card__link" href={item.cta.href}>
                  {item.cta.label} <span aria-hidden>→</span>
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};
