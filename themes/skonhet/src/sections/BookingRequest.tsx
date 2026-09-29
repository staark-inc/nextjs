import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead, telHref } from "../components/shared";
import { BookingForm } from "../components/BookingForm";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  formId: z.string().regex(/^[a-z0-9\-_]{1,64}$/).default("skonhet-bokning"),
  services: z.array(z.string()).default([]),
  stylists: z.array(z.string()).default([]),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(["10:00", "12:00", "14:00", "16:00", "18:00"]),
  submitLabel: z.string().default("Skicka bokningsförfrågan"),
  successMessage: z.string().optional(),
  /** Cancellation policy or similar, shown in the last step. */
  policy: z.string().optional(),
  /** Optional link to an external booking system (Bokadirekt etc.). */
  externalBooking: z.object({ label: z.string(), href: z.string() }).optional(),
});

/**
 * Booking request — a three-step form that lands in S-Hub Inbox as a booking
 * (booking_type / booking_date / booking_time / booking_item), with visit info
 * beside it. Block type: "bookingRequest".
 */
export const BookingRequest: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const { phone, address, openingHours } = ctx.site.contact;

  return (
    <section className="sk-section sk-sb-booking" id="boka">
      <Container>
        <div className="sk-sb-booking__grid">
          <div className="sk-sb-booking__copy">
            <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
            <dl className="sk-sb-info">
              {openingHours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{h.hours}</dd>
                </div>
              ))}
            </dl>
            {address ? (
              <p className="sk-sb-booking__address">
                {address.street}
                <br />
                {address.postalCode} {address.city}
              </p>
            ) : null}
            <div className="sk-sb-booking__links">
              {phone ? (
                <a href={telHref(phone)} className="sk-sb-textlink">
                  Ring {phone}
                </a>
              ) : null}
              {p.externalBooking ? (
                <a href={p.externalBooking.href} className="sk-sb-textlink" rel="noopener">
                  {p.externalBooking.label} ↗
                </a>
              ) : null}
            </div>
          </div>
          <BookingForm
            formId={p.formId}
            services={p.services}
            stylists={p.stylists}
            times={p.times}
            submitLabel={p.submitLabel}
            successMessage={p.successMessage}
            policy={p.policy}
          />
        </div>
      </Container>
    </section>
  );
};
