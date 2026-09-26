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
        title: z.string(),
        client: z.string().optional(),
        result: z.string().optional(),
        tags: z.array(z.string()).default([]),
        image: z.string().optional(),
        href: z.string().optional(),
        /** 1 = full-width feature card, 2 = half. Defaults to 2. */
        span: z.union([z.literal(1), z.literal(2)]).default(2),
      }),
    )
    .default([]),
});

/**
 * Case-study / portfolio grid. Each card is a bold color panel with the project
 * title and a headline result — it reads as intentional even without a photo,
 * and uses the image as a background when one is provided.
 * Shortcut/block type: "caseStudies".
 */
export const CaseStudies: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section" id="arbete">
      <Container wide>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className="sk-cases">
          {p.items.map((item, i) => {
            const Tag = item.href ? "a" : "div";
            return (
              <Tag
                key={item.title}
                className={`sk-case sk-case--span${item.span} sk-case--tone${(i % 3) + 1}`}
                {...(item.href ? { href: item.href } : {})}
                style={item.image ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,11,.1), rgba(10,10,11,.72)), url(${item.image})` } : undefined}
                data-has-image={item.image ? "1" : undefined}
              >
                <div className="sk-case__top">
                  {item.client ? <span className="sk-case__client">{item.client}</span> : null}
                  {item.tags.length ? (
                    <span className="sk-case__tags">{item.tags.join(" · ")}</span>
                  ) : null}
                </div>
                <div className="sk-case__body">
                  <h3 className="sk-case__title">{item.title}</h3>
                  {item.result ? <p className="sk-case__result">{item.result}</p> : null}
                </div>
              </Tag>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
