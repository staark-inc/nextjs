import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "../components/primitives";
import { ContactForm, type FieldDef } from "../components/ContactForm";

const fieldDef: z.ZodType<FieldDef> = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "tel", "textarea", "date", "time", "number"]).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  formId: z.string().default("booking-main"),
  submitLabel: z.string().default("Skicka bokningsförfrågan"),
  successMessage: z.string().optional(),
  fields: z.array(fieldDef).default([
    { name: "name", label: "Namn", required: true },
    { name: "email", label: "E-post", type: "email", required: true },
    { name: "phone", label: "Telefon", type: "tel" },
    { name: "booking_item", label: "Tjänst", required: true },
    { name: "booking_date", label: "Datum", type: "date", required: true },
    { name: "booking_time", label: "Tid", type: "time" },
    { name: "message", label: "Meddelande", type: "textarea" },
  ]),
});

export const BookingForm: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);

  return (
    <section className="sk-section sk-section--surface">
      <Container>
        <div className="sk-contact">
          <div className="sk-contact__intro">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h2>{p.heading}</h2>
            {p.intro ? <p>{p.intro}</p> : null}
          </div>
          <div className="sk-contact__form">
            <ContactForm
              formId={p.formId}
              kind="booking"
              endpoint="/api/staark/bookings"
              fields={p.fields}
              submitLabel={p.submitLabel}
              successMessage={p.successMessage}
            />
          </div>
        </div>
      </Container>
    </section>
  );
};
