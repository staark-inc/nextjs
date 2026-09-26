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
  formId: z.string().default("staark-home"),
  submitLabel: z.string().default("Skicka"),
  successMessage: z.string().optional(),
  fields: z.array(fieldDef).default([
    { name: "name", label: "Namn", required: true },
    { name: "email", label: "E-post", type: "email", required: true },
    { name: "phone", label: "Telefon", type: "tel" },
    { name: "message", label: "Meddelande", type: "textarea", required: true },
  ]),
});

export const Contact: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const { contact } = ctx.site;
  return (
    <section className="sk-section sk-section--surface" id="kontakt">
      <Container>
        <div className="sk-contact">
          <div className="sk-contact__intro">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            <h2>{p.heading}</h2>
            {p.intro ? <p>{p.intro}</p> : null}
            <ul className="sk-contact__meta">
              <li>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
              {contact.phone ? (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s+/g, "")}`}>{contact.phone}</a>
                </li>
              ) : null}
              {contact.address ? (
                <li>
                  {contact.address.street}, {contact.address.postalCode} {contact.address.city}
                </li>
              ) : null}
              {contact.openingHours.map((h) => (
                <li key={h.days}>
                  <strong>{h.days}:</strong> {h.hours}
                </li>
              ))}
            </ul>
          </div>
          <div className="sk-contact__form">
            <ContactForm formId={p.formId} fields={p.fields} submitLabel={p.submitLabel} successMessage={p.successMessage} />
          </div>
        </div>
      </Container>
    </section>
  );
};
