import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow, optionalLinkSchema } from "../components/primitives";

const projectImageSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const src = value.trim();
      return src ? { src, alt: "" } : undefined;
    }
    if (!value) return undefined;
    return value;
  },
  z
    .object({
      src: z.string(),
      alt: z.string().default(""),
    })
    .optional(),
);

const projectTagsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string()).default([]),
);

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  columns: z.union([z.literal(1), z.literal(2)]).default(2),
  items: z
    .array(
      z.object({
        client: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        image: projectImageSchema,
        result: z.string().optional(),
        tags: projectTagsSchema,
        cta: optionalLinkSchema,
      }),
    )
    .default([]),
});

export const ProjectsShowcase: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const HostImage = ctx.image;
  const blockIndex = ctx.blockIndex ?? Number.POSITIVE_INFINITY;
  const priorityFirstImage = blockIndex <= 1;
  const eagerFirstImage = blockIndex <= 2;
  const hasHeading = Boolean(p.eyebrow || p.heading || p.intro);

  return (
    <section className="sk-section sk-projects-showcase">
      <Container wide>
        {hasHeading ? (
          <header className="sk-section__head sk-projects-showcase__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            {p.heading ? <h2>{p.heading}</h2> : null}
            {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
          </header>
        ) : null}

        <div className={`sk-projects-showcase__grid sk-projects-showcase__grid--${p.columns}`}>
          {p.items.map((item, index) => {
            const priority = priorityFirstImage && index === 0;
            const eager = eagerFirstImage && index === 0;
            const imageAlt = item.image?.alt || (item.client ? `${item.client} project` : item.title);

            return (
              <article className="sk-project-card" key={`${item.title}-${index}`}>
                <div
                  className={`sk-project-card__media${item.image ? "" : " sk-project-card__media--empty"}`}
                >
                  {item.image ? (
                    HostImage ? (
                      <HostImage
                        src={item.image.src}
                        alt={imageAlt}
                        fill
                        sizes={
                          p.columns === 1
                            ? "(max-width: 860px) calc(100vw - 48px), 55vw"
                            : "(max-width: 860px) calc(100vw - 48px), 46vw"
                        }
                        priority={priority}
                        eager={eager}
                      />
                    ) : (
                      <img
                        src={item.image.src}
                        alt={imageAlt}
                        loading={eager ? "eager" : "lazy"}
                        fetchPriority={priority ? "high" : undefined}
                        decoding="async"
                      />
                    )
                  ) : (
                    <span className="sk-project-card__placeholder" aria-hidden>
                      {item.client?.slice(0, 1) || item.title.slice(0, 1)}
                    </span>
                  )}

                  {item.result ? <span className="sk-project-card__result">{item.result}</span> : null}
                </div>

                <div className="sk-project-card__body">
                  {item.client ? <p className="sk-project-card__client">{item.client}</p> : null}
                  <h3>{item.title}</h3>
                  {item.description ? <p className="sk-project-card__description">{item.description}</p> : null}

                  {item.tags.length ? (
                    <ul className="sk-project-card__tags" aria-label="Project tags">
                      {item.tags.map((tag, tagIndex) => (
                        <li key={`${tag}-${tagIndex}`}>{tag}</li>
                      ))}
                    </ul>
                  ) : null}

                  {item.cta?.label && item.cta.href ? (
                    <a className="sk-project-card__link" href={item.cta.href}>
                      {item.cta.label} <span aria-hidden>→</span>
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
