import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  items: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
});

/**
 * Stats band — a row of big editorial numbers (impact metrics).
 * Shortcut/block type: "stats".
 */
export const Stats: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-byra-stats">
      <Container wide>
        {p.heading ? (
          <header className="sk-section__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h2>{p.heading}</h2>
          </header>
        ) : null}
        <div className="sk-stats">
          {p.items.map((item) => (
            <div key={item.label} className="sk-stat">
              <div className="sk-stat__value">{item.value}</div>
              <div className="sk-stat__label">{item.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
