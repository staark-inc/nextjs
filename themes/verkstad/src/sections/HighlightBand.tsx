import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { Icon, optionalLink } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  text: z.string().optional(),
  cta: optionalLink,
  /** Short facts beside the text, e.g. { label: "Däckhotell", value: "från 695 kr/säsong" }. */
  facts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  icon: z.string().default("tire"),
});

/**
 * Highlight band — a seasonal or campaign strip (däckbyte, AC-service,
 * besiktningskoll) in the accent colour. Block type: "highlightBand".
 */
export const HighlightBand: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-vk-band" id="sasong">
      <Container>
        <div className="sk-vk-band__grid">
          <span className="sk-vk-band__icon" aria-hidden>
            <Icon name={p.icon} size={44} />
          </span>
          <div className="sk-vk-band__copy">
            {p.eyebrow ? <p className="sk-vk-label sk-vk-label--on-dark">{p.eyebrow}</p> : null}
            <h2>{p.heading}</h2>
            {p.text ? <p>{p.text}</p> : null}
          </div>
          {p.facts.length ? (
            <dl className="sk-vk-band__facts">
              {p.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {p.cta ? (
            <a className="sk-vk-btn sk-vk-btn--light" href={p.cta.href}>
              {p.cta.label}
            </a>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
