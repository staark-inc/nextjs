import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        icon: z.string().optional(),
      }),
    )
    .default([]),
});

/** Amenities — an icon grid of hospitality features (breakfast, wifi, parking, ...). */
export const Amenities: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-section--surface" id="bekvamligheter">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <ul className="sk-amenities">
          {p.items.map((item) => (
            <li key={item.label} className="sk-amenities__item">
              {item.icon ? <span className="sk-amenities__icon" aria-hidden>{item.icon}</span> : null}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
