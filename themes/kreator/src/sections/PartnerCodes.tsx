import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { imageSchema, SectionHead } from "../components/shared";
import { PartnerGrid } from "../components/PartnerGrid";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  partners: z
    .array(
      z.object({
        name: z.string(),
        offer: z.string().optional(),
        description: z.string().optional(),
        code: z.string().optional(),
        href: z.string(),
        category: z.string().default(""),
        logo: imageSchema.optional(),
        featured: z.boolean().default(false),
        cardStyle: z.enum(["standard", "promo", "artwork", "cover"]).default("standard"),
        background: imageSchema.optional(),
        backgroundPosition: z.enum(["center", "top", "bottom"]).default("center"),
        imageFit: z.enum(["natural", "cover", "contain"]).default("natural"),
        overlay: z.enum(["none", "soft", "dark"]).default("dark"),
        promoContent: z.enum(["actions", "full"]).default("actions"),
      }),
    )
    .default([]),
  allLabel: z.string().default("Toate"),
  linkLabel: z.string().default("Mergi la ofertă"),
  copyLabel: z.string().default("Copiază"),
  copiedLabel: z.string().default("Copiat!"),
  /** Advertising disclosure shown above the cards. Required in most markets for affiliate links. */
  disclosure: z.string().default("Reclamă: linkuri afiliate. Primesc un comision când cumperi prin ele, prețul pentru tine rămâne același."),
});

/**
 * Partner codes — sponsors and affiliate offers with a copyable code, a
 * sponsored link, optional logo and category filters, plus a disclosure line.
 * Block type: "partnerCodes".
 */
export const PartnerCodes: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.partners.length) return null;
  return (
    <section className="sk-section sk-kr-partners-section" id="coduri">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        {p.disclosure ? (
          <p className="sk-kr-disclosure">
            <span aria-hidden>ⓘ</span> {p.disclosure}
          </p>
        ) : null}
        <PartnerGrid partners={p.partners} allLabel={p.allLabel} linkLabel={p.linkLabel} copyLabel={p.copyLabel} copiedLabel={p.copiedLabel} />
      </Container>
    </section>
  );
};
