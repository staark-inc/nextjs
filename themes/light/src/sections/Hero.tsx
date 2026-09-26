import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Button, Container, Eyebrow, siteCta } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  primaryCta: z.object({ label: z.string(), href: z.string() }).optional(),
  secondaryCta: z.object({ label: z.string(), href: z.string() }).optional(),
  image: z.object({ src: z.string(), alt: z.string().default("") }).optional(),
  points: z.array(z.string()).default([]),
});

export const Hero: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const primary = p.primaryCta ?? siteCta(ctx.site);
  const variant = ctx.components.hero ?? "split";

  return (
    <section className={`sk-hero sk-hero--${variant}`}>
      <Container wide>
        <div className="sk-hero__grid">
          <div className="sk-hero__body">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h1 className="sk-hero__title">{p.heading}</h1>
            {p.intro ? <p className="sk-hero__intro">{p.intro}</p> : null}
            <div className="sk-hero__actions">
              <Button href={primary.href} ctx={ctx}>
                {primary.label}
              </Button>
              {p.secondaryCta ? (
                <Button href={p.secondaryCta.href} variant="ghost" ctx={ctx}>
                  {p.secondaryCta.label}
                </Button>
              ) : null}
            </div>
            {p.points.length ? (
              <ul className="sk-hero__points">
                {p.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {p.image && variant === "split" ? (
            <div className="sk-hero__media">
              {/* Plain <img>: Hub images are already sized/optimized; keeps the theme host-agnostic. */}
              <img src={p.image.src} alt={p.image.alt} loading="eager" />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
