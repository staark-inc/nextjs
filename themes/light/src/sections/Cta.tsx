import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Button, Container, siteCta } from "../components/primitives";

const schema = z.object({
  heading: z.string(),
  intro: z.string().optional(),
  cta: z.object({ label: z.string(), href: z.string() }).optional(),
});

export const Cta: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const cta = p.cta ?? siteCta(ctx.site);
  return (
    <section className={`sk-cta sk-cta--${ctx.components.footer ?? "dark"}`}>
      <Container>
        <div className="sk-cta__inner">
          <div>
            <h2>{p.heading}</h2>
            {p.intro ? <p>{p.intro}</p> : null}
          </div>
          <Button href={cta.href} ctx={ctx}>
            {cta.label}
          </Button>
        </div>
      </Container>
    </section>
  );
};
