import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { Icon, SectionHead, telHref } from "../components/shared";
import { ServiceBookingForm } from "../components/ServiceBookingForm";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  formId: z.string().regex(/^[a-z0-9\-_]{1,64}$/).default("verkstad-bokning"),
  services: z.array(z.string()).default(["Service", "Däckbyte", "Bromsar", "AC-service", "Felsökning", "Besiktningsförberedelse"]),
  dropOffTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(["07:30", "08:30", "10:00", "13:00"]),
  loanCar: z.boolean().default(true),
  submitLabel: z.string().default("Skicka bokning"),
  successMessage: z.string().optional(),
  consent: z.string().optional(),
  /** Short "how it works" lines beside the form. */
  notes: z.array(z.string()).default([]),
});

/**
 * Service booking — registration number, services, drop-off day and time,
 * optional loan car. Lands in S-Hub Inbox as a booking. Block type: "serviceBooking".
 */
export const ServiceBooking: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const { phone, address, openingHours } = ctx.site.contact;
  return (
    <section className="sk-section sk-vk-booking" id="boka">
      <Container>
        <div className="sk-vk-booking__grid">
          <div className="sk-vk-booking__copy">
            <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
            {p.notes.length ? (
              <ol className="sk-vk-notes">
                {p.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ol>
            ) : null}
            <div className="sk-vk-visit">
              {openingHours.length ? (
                <p>
                  <Icon name="clock" size={20} />
                  <span>{openingHours.map((h) => `${h.days} ${h.hours}`).join(" · ")}</span>
                </p>
              ) : null}
              {address ? (
                <p>
                  <Icon name="car" size={20} />
                  <span>
                    {address.street}, {address.postalCode} {address.city}
                  </span>
                </p>
              ) : null}
              {phone ? (
                <p>
                  <Icon name="phone" size={20} />
                  <a href={telHref(phone)}>{phone}</a>
                </p>
              ) : null}
            </div>
          </div>
          <ServiceBookingForm
            formId={p.formId}
            services={p.services}
            dropOffTimes={p.dropOffTimes}
            loanCar={p.loanCar}
            submitLabel={p.submitLabel}
            successMessage={p.successMessage}
            consent={p.consent}
          />
        </div>
      </Container>
    </section>
  );
};
