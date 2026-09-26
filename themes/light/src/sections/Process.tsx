import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string().optional() })).default([]),
});

export const Process: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-section--surface">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
        </header>
        <ol className="sk-steps">
          {p.steps.map((step, i) => (
            <li key={step.title} className="sk-steps__item">
              <span className="sk-steps__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                {step.description ? <p>{step.description}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
};
