import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string().optional() })).default([]),
});

/** El process — same props as the S-Hub Light process, heavier numbered rules. */
export const Process: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-el-process">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} />
        <ol className="sk-el-steps">
          {p.steps.map((step, i) => (
            <li key={`${step.title}-${i}`} className="sk-el-steps__item">
              <span className="sk-el-steps__num" aria-hidden>
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              {step.description ? <p>{step.description}</p> : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
};
