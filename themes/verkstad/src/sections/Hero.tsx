import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, siteCta } from "@staark/theme-light";
import { imageSchema, optionalLink, PhoneIcon, telHref } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  primaryCta: optionalLink,
  secondaryCta: optionalLink,
  showPhone: z.boolean().default(true),
  image: imageSchema.optional(),
  points: z.array(z.string()).default([]),
  /** "Book with your registration number" box. Submits ?regnr=… to the booking block, no JavaScript needed. */
  plate: z
    .object({
      label: z.string().default("Boka med ditt regnummer"),
      placeholder: z.string().default("ABC 123"),
      buttonLabel: z.string().default("Boka"),
      href: z.string().default("#boka"),
      countryCode: z.string().default("S"),
    })
    .optional(),
});

/**
 * Verkstad hero — overrides the S-Hub Light hero (same core props) with a dark
 * layout and a licence-plate input that jumps to the booking form with the
 * registration number filled in. Block type: "hero".
 */
export const Hero: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const primary = p.primaryCta ?? siteCta(ctx.site);
  const phone = ctx.site.contact.phone;
  const HostImage = ctx.image;
  const priority = (ctx.blockIndex ?? Infinity) <= 1;

  return (
    <section className="sk-vk-hero">
      {p.image ? (
        <div className="sk-vk-hero__bg" aria-hidden={!p.image.alt}>
          {HostImage ? (
            <HostImage src={p.image.src} alt={p.image.alt} fill sizes="100vw" priority={priority} eager={priority} className="sk-vk-cover" />
          ) : (
            <img src={p.image.src} alt={p.image.alt} className="sk-vk-cover" />
          )}
        </div>
      ) : null}
      <Container wide>
        <div className="sk-vk-hero__body">
          {p.eyebrow ? <p className="sk-vk-label sk-vk-label--on-dark">{p.eyebrow}</p> : null}
          <h1 className="sk-vk-hero__title">{p.heading}</h1>
          {p.intro ? <p className="sk-vk-hero__intro">{p.intro}</p> : null}

          {p.plate ? (
            <form className="sk-vk-plate" method="get" action={p.plate.href}>
              <label className="sk-vk-plate__label" htmlFor="sk-vk-regnr">
                {p.plate.label}
              </label>
              <div className="sk-vk-plate__row">
                <div className="sk-vk-plate__field">
                  <span className="sk-vk-plate__eu" aria-hidden>
                    {p.plate.countryCode}
                  </span>
                  <input
                    id="sk-vk-regnr"
                    name="regnr"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={p.plate.placeholder}
                    maxLength={8}
                    pattern="[A-Za-z]{3}[\s\-]?[0-9]{2}[A-Za-z0-9]"
                    title="Tre bokstäver och tre tecken, t.ex. ABC 123"
                    required
                  />
                </div>
                <button type="submit" className="sk-btn sk-btn--primary sk-vk-btn">
                  {p.plate.buttonLabel}
                </button>
              </div>
            </form>
          ) : (
            <div className="sk-vk-hero__actions">
              {primary ? (
                <a
                  className="sk-btn sk-btn--primary sk-vk-btn"
                  href={primary.href}
                >
                  {primary.label}
                </a>
              ) : null}
            </div>
          )}

          <div className="sk-vk-hero__secondary">
            {p.secondaryCta ? (
              <a className="sk-vk-hero__link" href={p.secondaryCta.href}>
                {p.secondaryCta.label} →
              </a>
            ) : null}
            {p.showPhone && phone ? (
              <a className="sk-vk-hero__link" href={telHref(phone)}>
                <PhoneIcon size={18} />
                {phone}
              </a>
            ) : null}
          </div>

          {p.points.length ? (
            <ul className="sk-vk-hero__points">
              {p.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
