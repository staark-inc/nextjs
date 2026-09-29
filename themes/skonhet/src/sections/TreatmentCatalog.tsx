import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().default(""),
  duration: z.string().default(""),
  price: z.string().default(""),
  bookable: z.boolean().default(true),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().default(""),
  services: z.array(serviceSchema).default([]),
});

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  categories: z.array(categorySchema).default([]),
});

export const TreatmentCatalog: SectionComponent<
  z.infer<typeof schema>
> = ({ props }) => {
  const p = schema.parse(props);

  return (
    <section className="sk-sb-treatment-catalog">
      <div className="sk-sb-treatment-catalog__inner">
        {p.heading || p.intro ? (
          <header className="sk-sb-treatment-catalog__head">
            {p.eyebrow ? (
              <span className="sk-sb-treatment-catalog__eyebrow">
                {p.eyebrow}
              </span>
            ) : null}

            {p.heading ? <h2>{p.heading}</h2> : null}

            {p.intro ? <p>{p.intro}</p> : null}
          </header>
        ) : null}

        <div className="sk-sb-treatment-catalog__categories">
          {p.categories.map((category) => (
            <section
              key={category.id ?? category.name}
              className="sk-sb-treatment-catalog__category"
            >
              <header className="sk-sb-treatment-catalog__category-head">
                <span className="sk-sb-treatment-catalog__category-label">
                  Tjänster
                </span>

                <h2>{category.name}</h2>

                {category.description ? (
                  <p>{category.description}</p>
                ) : null}
              </header>

              <div className="sk-sb-treatment-catalog__grid">
                {category.services.map((service) => (
                  <article
                    key={service.id ?? service.name}
                    className="sk-sb-treatment-catalog__card"
                  >
                    <div className="sk-sb-treatment-catalog__card-body">
                      <h3>{service.name}</h3>

                      {service.description ? (
                        <p className="sk-sb-treatment-catalog__description">
                          {service.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="sk-sb-treatment-catalog__meta">
                      {service.price ? (
                        <strong>{service.price}</strong>
                      ) : null}

                      {service.duration ? (
                        <span>{service.duration}</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
};
