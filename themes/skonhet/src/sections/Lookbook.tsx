import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { optionalLink, SectionHead } from "../components/shared";
import { LookbookGrid } from "../components/LookbookGrid";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  items: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string().default(""),
        category: z.string().default(""),
        caption: z.string().optional(),
      }),
    )
    .default([]),
  allLabel: z.string().default("Allt"),
  /** e.g. { label: "Mer på Instagram", href: "https://instagram.com/…" } */
  cta: optionalLink,
});

/**
 * Lookbook — recent work (klipp, färg, nageldesign) with category filters.
 * Block type: "lookbook".
 */
export const Lookbook: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-sb-lookbook" id="lookbook">
      <Container>
        <div className="sk-sb-lookbook__head">
          <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
          {p.cta ? (
            <a className="sk-sb-btn sk-sb-btn--ghost" href={p.cta.href}>
              {p.cta.label}
            </a>
          ) : null}
        </div>
        <LookbookGrid items={p.items} allLabel={p.allLabel} />
      </Container>
    </section>
  );
};
