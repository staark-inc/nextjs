import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  items: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  /** Emit FAQPage structured data for search engines. */
  structuredData: z.boolean().default(true),
});

/**
 * FAQ — native <details> accordion (works without JavaScript) with optional
 * FAQPage JSON-LD. Block type: "faq".
 */
export const Faq: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.items.length) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
  return (
    <section className="sk-section sk-el-faq" id="fragor">
      <Container>
        <div className="sk-el-faq__grid">
          <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
          <div className="sk-el-faq__list">
            {p.items.map((item, i) => (
              <details key={item.question} className="sk-el-faq__item" open={i === 0}>
                <summary>{item.question}</summary>
                <p style={{ whiteSpace: "pre-line" }}>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
      {p.structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
    </section>
  );
};
