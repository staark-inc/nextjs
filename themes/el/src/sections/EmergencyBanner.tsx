import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { PhoneIcon, telHref } from "../components/shared";

const schema = z.object({
  text: z.string().default("Jour dygnet runt vid strömavbrott"),
  /** Defaults to the site phone number. */
  phone: z.string().optional(),
  note: z.string().optional(),
  mobileBar: z
    .object({
      enabled: z.boolean().default(true),
      callLabel: z.string().default("Ring"),
      quoteLabel: z.string().default("Begär offert"),
      quoteHref: z.string().default("#offert"),
    })
    .prefault({}),
});

/**
 * Emergency banner — the "jour" strip under the header, plus a sticky
 * call/quote bar on phones (most trades leads arrive from mobile).
 * Block type: "emergencyBanner". Put it first on the page.
 */
export const EmergencyBanner: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const phone = p.phone ?? ctx.site.contact.phone;

  return (
    <>
      <div className="sk-el-banner">
        <Container>
          <div className="sk-el-banner__inner">
            <span className="sk-el-banner__text">
              <span className="sk-el-banner__dot" aria-hidden />
              {p.text}
            </span>
            {p.note ? <span className="sk-el-banner__note">{p.note}</span> : null}
            {phone ? (
              <a className="sk-el-banner__phone" href={telHref(phone)}>
                {phone}
              </a>
            ) : null}
          </div>
        </Container>
      </div>
      {p.mobileBar.enabled ? (
        <nav className="sk-el-mobilebar" aria-label="Snabbkontakt">
          {phone ? (
            <a className="sk-el-btn sk-el-btn--outline" href={telHref(phone)}>
              <PhoneIcon size={18} />
              {p.mobileBar.callLabel}
            </a>
          ) : null}
          <a className="sk-btn sk-btn--primary sk-el-btn" href={p.mobileBar.quoteHref}>
            {p.mobileBar.quoteLabel}
          </a>
        </nav>
      ) : null}
    </>
  );
};
