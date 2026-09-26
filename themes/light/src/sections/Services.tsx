import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        price: z.string().optional(),
      }),
    )
    .default([]),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export const Services: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const cards = ctx.components.cards ?? "soft";
  return (
    <section className="sk-section">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className={`sk-grid sk-grid--${p.columns}`}>
          {p.items.map((item) => (
            <article key={item.title} className={`sk-card sk-card--${cards}`}>
              {item.icon ? <div className="sk-card__icon" aria-hidden>{item.icon}</div> : null}
              <h3>{item.title}</h3>
              {item.description ? <p>{item.description}</p> : null}
              {item.price ? <p className="sk-card__price">{item.price}</p> : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};
