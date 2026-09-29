import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { ShieldIcon } from "../components/shared";

const schema = z.object({
  items: z.array(z.object({ title: z.string(), text: z.string().optional() })).default([]),
  /** e.g. { label: "Kontrollera oss hos Elsäkerhetsverket", href: "https://…" } */
  verify: z.object({ label: z.string(), href: z.string() }).optional(),
  registration: z.string().optional(),
});

/**
 * Credentials — authorization and insurance, with an optional link to the
 * public register so customers can verify the company. Block type: "credentials".
 */
export const Credentials: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.items.length) return null;
  return (
    <section className="sk-el-cred" aria-label="Behörighet och trygghet">
      <Container>
        <div className="sk-el-cred__inner">
          <ul className="sk-el-cred__list">
            {p.items.map((item) => (
              <li key={item.title}>
                <span className="sk-el-cred__icon">
                  <ShieldIcon />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  {item.text ? <span className="sk-el-cred__text">{item.text}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {p.verify || p.registration ? (
            <div className="sk-el-cred__verify">
              {p.registration ? <span className="sk-el-cred__reg">{p.registration}</span> : null}
              {p.verify ? (
                <a href={p.verify.href} rel="noopener" className="sk-el-textlink">
                  {p.verify.label} ↗
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
