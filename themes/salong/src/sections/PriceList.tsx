import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  groups: z
    .array(
      z.object({
        title: z.string().optional(),
        items: z.array(z.object({ name: z.string(), description: z.string().optional(), price: z.string(), duration: z.string().optional() })).default([]),
      }),
    )
    .default([]),
});

/** Salon price list — services grouped with prices and durations. */
export const PriceList: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section" id="priser">
      <Container>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className="sk-pricelist">
          {p.groups.map((group, gi) => (
            <div key={group.title ?? gi} className="sk-pricelist__group">
              {group.title ? <h3>{group.title}</h3> : null}
              <ul>
                {group.items.map((item) => (
                  <li key={item.name} className="sk-price">
                    <div className="sk-price__label">
                      <span className="sk-price__name">{item.name}</span>
                      {item.description ? <span className="sk-price__desc">{item.description}</span> : null}
                    </div>
                    <div className="sk-price__meta">
                      {item.duration ? <span className="sk-price__dur">{item.duration}</span> : null}
                      <span className="sk-price__amount">{item.price}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
