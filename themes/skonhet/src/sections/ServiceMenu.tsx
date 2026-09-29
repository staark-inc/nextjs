import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead } from "../components/shared";
import { MenuTabs } from "../components/MenuTabs";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  categories: z
    .array(
      z.object({
        name: z.string(),
        note: z.string().optional(),
        items: z
          .array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              duration: z.string().optional(),
              price: z.string(),
              bookable: z.boolean().default(true),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  /** Where "Boka" goes; the service name is added as ?tjanst=. */
  bookHref: z.string().default("#boka"),
  bookLabel: z.string().default("Boka"),
  footnote: z.string().optional(),
});

/**
 * Service menu — treatments grouped in tabs (Hår / Naglar / Fransar & bryn)
 * with duration, price and a "Boka" link that preselects the treatment in the
 * bookingRequest block. Block type: "serviceMenu".
 */
export const ServiceMenu: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-sb-menu-section" id="behandlingar">
      <Container>
        <div className="sk-sb-menu-section__grid">
          <div>
            <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
            {p.footnote ? <p className="sk-sb-menu__footnote">{p.footnote}</p> : null}
          </div>
          <MenuTabs categories={p.categories} bookHref={p.bookHref} bookLabel={p.bookLabel} />
        </div>
      </Container>
    </section>
  );
};
