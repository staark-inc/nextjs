import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  areas: z.array(z.string()).default([]),
  note: z.string().optional(),
});

/**
 * Service areas — a local-SEO section listing the towns/regions served, like the
 * geographic band on staarkinc.com.
 * Shortcut/block type: "serviceAreas".
 */
export const ServiceAreas: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section" id="omraden">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <ul className="sk-areas">
          {p.areas.map((area) => (
            <li key={area} className="sk-area">
              {area}
            </li>
          ))}
        </ul>
        {p.note ? <p className="sk-areas__note">{p.note}</p> : null}
      </Container>
    </section>
  );
};
