import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  items: z
    .array(z.object({ quote: z.string(), author: z.string(), role: z.string().optional(), rating: z.number().min(1).max(5).optional() }))
    .default([]),
});

export const Testimonials: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section">
      <Container>
        {p.heading ? (
          <header className="sk-section__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h2>{p.heading}</h2>
          </header>
        ) : null}
        <div className="sk-grid sk-grid--3">
          {p.items.map((item) => (
            <figure key={item.author} className="sk-card sk-card--soft sk-quote">
              {item.rating ? <div className="sk-quote__stars" aria-label={`${item.rating} av 5`}>{"★".repeat(item.rating)}</div> : null}
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                <strong>{item.author}</strong>
                {item.role ? <span>{item.role}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
};
