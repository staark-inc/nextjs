import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow, Button } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  client: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  result: z.string().optional(),
  tags: z.array(z.string()).default([]),
  cta: z.object({ label: z.string(), href: z.string() }).optional(),
});

/**
 * Featured project — a large split card with the client, a headline, a result
 * metric and a link. Mirrors the "featured project" band on staarkinc.com.
 * Renders a tinted panel when no image is provided, so it looks complete offline.
 * Shortcut/block type: "featuredProject".
 */
export const FeaturedProject: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section">
      <Container wide>
        <header className="sk-section__head">{p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}</header>
        <div className="sk-feature">
          <div
            className="sk-feature__media"
            style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
            data-has-image={p.image ? "1" : undefined}
          >
            {p.result ? <span className="sk-feature__result">{p.result}</span> : null}
          </div>
          <div className="sk-feature__body">
            {p.client ? <span className="sk-feature__client">{p.client}</span> : null}
            <h2>{p.title}</h2>
            {p.description ? <p>{p.description}</p> : null}
            {p.tags.length ? (
              <ul className="sk-feature__tags">
                {p.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
            {p.cta ? (
              <Button href={p.cta.href} ctx={ctx}>
                {p.cta.label}
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
};
