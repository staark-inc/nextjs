import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  members: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        image: z.string().optional(),
        bio: z.string().optional(),
      }),
    )
    .default([]),
});

/** Initials for the monogram avatar when there's no photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Team grid. Falls back to a colored monogram avatar (initials) when a member
 * has no photo, so the section renders fully offline.
 * Shortcut/block type: "team".
 */
export const Team: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-section--surface" id="team">
      <Container wide>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className="sk-team">
          {p.members.map((member, i) => (
            <article key={member.name} className="sk-member">
              {member.image ? (
                <img className="sk-member__photo" src={member.image} alt={member.name} loading="lazy" />
              ) : (
                <div className={`sk-member__monogram sk-member--tone${(i % 3) + 1}`} aria-hidden>
                  {initials(member.name)}
                </div>
              )}
              <h3 className="sk-member__name">{member.name}</h3>
              {member.role ? <p className="sk-member__role">{member.role}</p> : null}
              {member.bio ? <p className="sk-member__bio">{member.bio}</p> : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};
