import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow, Button } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  plans: z
    .array(
      z.object({
        name: z.string(),
        price: z.string(),
        period: z.string().optional(),
        description: z.string().optional(),
        features: z.array(z.string()).default([]),
        cta: z.object({ label: z.string(), href: z.string() }).optional(),
        featured: z.boolean().default(false),
      }),
    )
    .default([]),
  note: z.string().optional(),
});

/**
 * Pricing — productized packages with one highlighted plan, like the pricing
 * band on staarkinc.com ("from 2 999 SEK").
 * Shortcut/block type: "pricing".
 */
export const Pricing: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-section--surface" id="priser">
      <Container wide>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className="sk-plans">
          {p.plans.map((plan) => (
            <article key={plan.name} className={`sk-plan${plan.featured ? " sk-plan--featured" : ""}`}>
              {plan.featured ? <span className="sk-plan__badge">Populärast</span> : null}
              <h3 className="sk-plan__name">{plan.name}</h3>
              <div className="sk-plan__price">
                <span className="sk-plan__amount">{plan.price}</span>
                {plan.period ? <span className="sk-plan__period">{plan.period}</span> : null}
              </div>
              {plan.description ? <p className="sk-plan__desc">{plan.description}</p> : null}
              <ul className="sk-plan__features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.cta ? (
                <Button href={plan.cta.href} variant={plan.featured ? "primary" : "ghost"} ctx={ctx}>
                  {plan.cta.label}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
        {p.note ? <p className="sk-plans__note">{p.note}</p> : null}
      </Container>
    </section>
  );
};
