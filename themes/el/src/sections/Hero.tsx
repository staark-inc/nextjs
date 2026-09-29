import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, siteCta } from "@staark/theme-light";
import { BoltIcon, imageSchema, optionalLink, PhoneIcon, ShieldIcon, telHref } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  /** Part of the heading drawn with the yellow marker, e.g. "rätt dragen". */
  highlight: z.string().optional(),
  intro: z.string().optional(),
  primaryCta: optionalLink,
  secondaryCta: optionalLink,
  showPhone: z.boolean().default(true),
  image: imageSchema.optional(),
  points: z.array(z.string()).default([]),
  /** Authorization line under the buttons, e.g. "Auktoriserat elinstallationsföretag". */
  authorization: z.string().optional(),
});

/**
 * El hero — overrides the S-Hub Light hero (same core props) with a dark
 * full-bleed layout, a yellow marker on part of the heading and the company's
 * authorization line. Block type: "hero".
 */
export const Hero: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const primary = p.primaryCta ?? siteCta(ctx.site);
  const phone = ctx.site.contact.phone;
  const HostImage = ctx.image;
  const priority = (ctx.blockIndex ?? Infinity) <= 1;

  const heading = (() => {
    if (!p.highlight || !p.heading.includes(p.highlight)) return p.heading;
    const [before, after] = p.heading.split(p.highlight);
    return (
      <>
        {before}
        <mark>{p.highlight}</mark>
        {after}
      </>
    );
  })();

  return (
    <section className="sk-el-hero">
      <Container wide>
        <div className="sk-el-hero__grid">
          <div className="sk-el-hero__body">
            {p.eyebrow ? (
              <p className="sk-el-label sk-el-label--on-dark">
                <BoltIcon size={14} />
                {p.eyebrow}
              </p>
            ) : null}
            <h1 className="sk-el-hero__title">{heading}</h1>
            {p.intro ? <p className="sk-el-hero__intro">{p.intro}</p> : null}
            <div className="sk-el-hero__actions">
              <a className="sk-btn sk-btn--primary sk-el-btn" href={primary.href}>
                {primary.label}
              </a>
              {p.secondaryCta ? (
                <a className="sk-el-btn sk-el-btn--on-dark" href={p.secondaryCta.href}>
                  {p.secondaryCta.href.startsWith("tel:") ? <PhoneIcon /> : null}
                  {p.secondaryCta.label}
                </a>
              ) : p.showPhone && phone ? (
                <a className="sk-el-btn sk-el-btn--on-dark" href={telHref(phone)}>
                  <PhoneIcon />
                  {phone}
                </a>
              ) : null}
            </div>
            {p.points.length ? (
              <ul className="sk-el-hero__points">
                {p.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
            {p.authorization ? (
              <p className="sk-el-hero__auth">
                <ShieldIcon />
                {p.authorization}
              </p>
            ) : null}
          </div>
          <div className="sk-el-hero__media">
            {p.image ? (
              HostImage ? (
                <HostImage src={p.image.src} alt={p.image.alt} fill sizes="(max-width: 900px) 100vw, 45vw" priority={priority} eager={priority} className="sk-el-cover" />
              ) : (
                <img src={p.image.src} alt={p.image.alt} className="sk-el-cover" />
              )
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
};
