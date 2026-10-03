import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { Icon, SectionHead } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  items: z.array(z.object({ title: z.string(), text: z.string().optional(), icon: z.string().default("check") })).default([]),
});

/**
 * Promises — what the customer can count on (märkesoberoende, fast pris,
 * lånebil, "vi ringer innan extra arbete"). Icons by name. Block type: "promises".
 */
export const Promises: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.items.length) return null;
  return (
    <section className="sk-vk-promises">
      <Container>
        {p.heading ? <SectionHead eyebrow={p.eyebrow} heading={p.heading} /> : null}
        <ul className="sk-vk-promises__grid">
          {p.items.map((item) => (
            <li key={item.title} className="sk-vk-promise">
              <span className="sk-vk-promise__icon">
                <Icon name={item.icon} size={26} />
              </span>
              <strong>{item.title}</strong>
              {item.text ? <span>{item.text}</span> : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
