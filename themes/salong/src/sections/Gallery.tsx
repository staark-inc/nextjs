import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  images: z.array(z.object({ src: z.string(), alt: z.string().default("") })).default([]),
});

/** Salon gallery — a masonry-ish image grid. */
export const Gallery: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-section--surface" id="galleri">
      <Container wide>
        {p.heading ? (
          <header className="sk-section__head">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h2>{p.heading}</h2>
          </header>
        ) : null}
        <div className="sk-gallery">
          {p.images.map((image, i) => (
            <figure key={image.src} className={`sk-gallery__item${i % 5 === 0 ? " sk-gallery__item--tall" : ""}`}>
              <img src={image.src} alt={image.alt} loading="lazy" />
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
};
