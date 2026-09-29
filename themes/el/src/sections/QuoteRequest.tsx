import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { PhoneIcon, SectionHead, telHref } from "../components/shared";
import { QuoteForm } from "../components/QuoteForm";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  /** Towns/kommuner served — shown next to the form (local SEO). */
  areas: z.array(z.string()).default([]),
  areasLabel: z.string().default("Vi arbetar i"),
  formId: z.string().regex(/^[a-z0-9\-_]{1,64}$/).default("el-offert"),
  jobTypes: z.array(z.string()).default(["Laddbox", "Elcentral", "Belysning", "Felsökning", "Solceller", "Annat"]),
  timings: z.array(z.string()).default(["Inom 1–3 månader", "Så snart som möjligt", "Jag planerar bara"]),
  submitLabel: z.string().default("Skicka förfrågan"),
  successMessage: z.string().optional(),
  consent: z.string().optional(),
});

/**
 * Quote request — a three-step offert form (jobb → detaljer → kontakt) that
 * lands in S-Hub Inbox, with the service area and opening hours beside it.
 * Block type: "quoteRequest".
 */
export const QuoteRequest: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const { phone, openingHours } = ctx.site.contact;

  return (
    <section className="sk-section sk-el-quote" id="offert">
      <Container>
        <div className="sk-el-quote__grid">
          <div className="sk-el-quote__copy">
            <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
            {p.areas.length ? (
              <div className="sk-el-areas">
                <p className="sk-el-label">{p.areasLabel}</p>
                <ul>
                  {p.areas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <dl className="sk-el-hours">
              {openingHours.map((h) => (
                <div key={h.days}>
                  <dt className="sk-el-label">{h.days}</dt>
                  <dd>{h.hours}</dd>
                </div>
              ))}
            </dl>
            {phone ? (
              <a className="sk-el-btn sk-el-btn--outline" href={telHref(phone)}>
                <PhoneIcon />
                {phone}
              </a>
            ) : null}
          </div>
          <QuoteForm formId={p.formId} jobTypes={p.jobTypes} timings={p.timings} submitLabel={p.submitLabel} successMessage={p.successMessage} consent={p.consent} />
        </div>
      </Container>
    </section>
  );
};
