import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { ClockIcon, imageSchema, optionalLink, PinIcon } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  /** Rendered in italic after the heading, e.g. "för hår & naglar". */
  headingAccent: z.string().optional(),
  intro: z.string().optional(),
  primaryCta: optionalLink,
  secondaryCta: optionalLink,
  image: imageSchema.optional(),
  /** Smaller second image overlapping the first. */
  detailImage: imageSchema.optional(),
  /** Small round badge on the image, e.g. "−15 % första besöket". */
  badge: z.string().optional(),
  /** Show address and opening hours from site settings under the buttons. */
  showVisit: z.boolean().default(true),
});

/**
 * Skönhet hero — overrides the S-Hub Light hero (same core props) with an
 * editorial layout: serif heading with an italic accent, arched main image, a
 * detail image and the visit info (address + hours) straight from site settings.
 */
export const Hero: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const primary = p.primaryCta;
  const { address, openingHours } = ctx.site.contact;
  const HostImage = ctx.image;
  const priority = (ctx.blockIndex ?? Infinity) <= 1;

  const picture = (img: { src: string; alt: string }, sizes: string, eager: boolean) =>
    HostImage ? <HostImage src={img.src} alt={img.alt} fill sizes={sizes} priority={eager} eager={eager} className="sk-sb-cover" /> : <img src={img.src} alt={img.alt} className="sk-sb-cover" />;

  return (
    <section className="sk-sb-hero">
      <Container wide>
        <div className="sk-sb-hero__grid">
          <div className="sk-sb-hero__body">
            {p.eyebrow ? <p className="sk-sb-eyebrow">{p.eyebrow}</p> : null}
            <h1 className="sk-sb-hero__title">
              {p.heading}
              {p.headingAccent ? (
                <>
                  {" "}
                  <em>{p.headingAccent}</em>
                </>
              ) : null}
            </h1>
            {p.intro ? <p className="sk-sb-hero__intro">{p.intro}</p> : null}
            {primary || p.secondaryCta ? (
              <div className="sk-sb-hero__actions">
                {primary ? (
                  <a
                    className="sk-btn sk-btn--primary sk-sb-btn"
                    href={primary.href}
                  >
                    {primary.label}
                  </a>
                ) : null}

                {p.secondaryCta ? (
                  <a
                    className="sk-sb-btn sk-sb-btn--ghost"
                    href={p.secondaryCta.href}
                  >
                    {p.secondaryCta.label}
                  </a>
                ) : null}
              </div>
            ) : null}
            {p.showVisit && (address || openingHours.length) ? (
              <dl className="sk-sb-visit">
                {address ? (
                  <div>
                    <dt>
                      <PinIcon />
                      <span className="sk-sb-sr">Adress</span>
                    </dt>
                    <dd>
                      {address.street}, {address.city}
                    </dd>
                  </div>
                ) : null}
                {openingHours.length ? (
                  <div>
                    <dt>
                      <ClockIcon />
                      <span className="sk-sb-sr">Öppettider</span>
                    </dt>
                    <dd>{openingHours.map((h) => `${h.days} ${h.hours}`).join(" · ")}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>

          <div className="sk-sb-hero__media">
            <div className="sk-sb-hero__arch">{p.image ? picture(p.image, "(max-width: 900px) 90vw, 40vw", priority) : null}</div>
            {p.detailImage ? <div className="sk-sb-hero__detail">{picture(p.detailImage, "200px", false)}</div> : null}
            {p.badge ? <p className="sk-sb-hero__badge">{p.badge}</p> : null}
          </div>
        </div>
      </Container>
    </section>
  );
};
