import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "../components/primitives";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  items: z
    .array(
      z.object({
        title: z.string(),
        links: z
          .array(
            z.object({
              label: z.string(),
              href: z.string(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

export const LinkColumns: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  const hasHeading = Boolean(p.eyebrow || p.heading || p.intro);

  return (
    <section className="sk-section sk-link-columns-section">
      <Container>
        {hasHeading ? (
          <header className="sk-section__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            {p.heading ? <h2>{p.heading}</h2> : null}
            {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
          </header>
        ) : null}

        <div className={`sk-grid sk-grid--${p.columns} sk-link-columns`}>
          {p.items.map((column, index) => (
            <div className="sk-link-column" key={`${column.title}-${index}`}>
              <h3>{column.title}</h3>
              <nav aria-label={column.title}>
                <ul>
                  {column.links.map((link, linkIndex) => (
                    <li key={`${link.label}-${linkIndex}`}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
