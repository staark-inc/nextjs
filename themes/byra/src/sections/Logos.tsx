import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";

const schema = z.object({
  heading: z.string().optional(),
  /** Client names shown as a wordmark wall (text). Optional image per logo. */
  logos: z.array(z.union([z.string(), z.object({ name: z.string(), src: z.string().optional() })])).default([]),
});

function name(logo: string | { name: string; src?: string }): string {
  return typeof logo === "string" ? logo : logo.name;
}
function src(logo: string | { name: string; src?: string }): string | undefined {
  return typeof logo === "string" ? undefined : logo.src;
}

/**
 * Client logo wall. Renders wordmarks as text (uppercase) when no image is
 * given, so it always looks complete.
 * Shortcut/block type: "logos".
 */
export const Logos: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-byra-logos">
      <Container wide>
        {p.heading ? <p className="sk-byra-logos__heading">{p.heading}</p> : null}
        <div className="sk-logos">
          {p.logos.map((logo) => (
            <div key={name(logo)} className="sk-logo">
              {src(logo) ? <img src={src(logo)} alt={name(logo)} loading="lazy" /> : <span>{name(logo)}</span>}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
