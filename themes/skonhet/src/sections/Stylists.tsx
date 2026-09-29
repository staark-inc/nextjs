import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { imageSchema, initials, SectionHead, withParam } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  people: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        image: imageSchema.optional(),
        specialties: z.array(z.string()).default([]),
        bookable: z.boolean().default(true),
      }),
    )
    .default([]),
  /** Where "Boka med …" goes; the name is added as ?med=. */
  bookHref: z.string().default("#boka"),
  bookLabel: z.string().default("Boka med"),
});

/**
 * Stylists — the people behind the chairs, with specialties and a link that
 * preselects them in the booking form. A missing photo falls back to initials.
 * Block type: "stylists".
 */
export const Stylists: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const HostImage = ctx.image;
  return (
    <section className="sk-section sk-sb-team" id="team">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} align="center" />
        <ul className="sk-sb-team__grid">
          {p.people.map((person) => (
            <li key={person.name} className="sk-sb-person">
              <div className="sk-sb-person__photo">
                {person.image ? (
                  HostImage ? (
                    <HostImage src={person.image.src} alt={person.image.alt || person.name} fill sizes="(max-width: 700px) 45vw, 260px" className="sk-sb-cover" />
                  ) : (
                    <img src={person.image.src} alt={person.image.alt || person.name} className="sk-sb-cover" />
                  )
                ) : (
                  <span className="sk-sb-person__initials" aria-hidden>
                    {initials(person.name)}
                  </span>
                )}
              </div>
              <h3>{person.name}</h3>
              {person.role ? <p className="sk-sb-person__role">{person.role}</p> : null}
              {person.specialties.length ? (
                <ul className="sk-sb-person__tags">
                  {person.specialties.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
              {person.bookable ? (
                <a className="sk-sb-person__book" href={withParam(p.bookHref, "med", person.name)}>
                  {p.bookLabel} {person.name.split(" ")[0]} →
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
