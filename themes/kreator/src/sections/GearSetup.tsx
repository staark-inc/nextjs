import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { imageSchema, isExternal, SectionHead } from "../components/shared";
import { CopyCode } from "../components/CopyCode";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  image: imageSchema.optional(),
  groups: z
    .array(
      z.object({
        title: z.string(),
        items: z
          .array(
            z.object({
              label: z.string(),
              name: z.string(),
              spec: z.string().optional(),
              href: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  /** Game settings as label/value pairs (DPI, sensitivity, resolution …). */
  settings: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  settingsTitle: z.string().default("Setări"),
  /** A copyable config string, e.g. a crosshair code. */
  configCode: z.object({ label: z.string(), code: z.string().min(1) }).optional(),
  copyLabel: z.string().default("Copiază"),
  copiedLabel: z.string().default("Copiat!"),
  /** Shown when any item has a link. */
  linkNote: z.string().default("Unele linkuri sunt afiliate."),
});

/**
 * Gear setup — the creator's setup (PC, peripherals, audio) grouped, game
 * settings as a spec sheet and an optional copyable config code.
 * Block type: "gearSetup".
 */
export const GearSetup: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const HostImage = ctx.image;
  const hasLinks = p.groups.some((g) => g.items.some((i) => i.href));

  return (
    <section className="sk-section sk-kr-setup" id="setup">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        <div className={`sk-kr-setup__grid${p.image ? " sk-kr-setup__grid--image" : ""}`}>
          {p.image ? (
            <div className="sk-kr-setup__image">
              {HostImage ? (
                <HostImage src={p.image.src} alt={p.image.alt} fill sizes="(max-width: 900px) 100vw, 40vw" className="sk-kr-cover" />
              ) : (
                <img src={p.image.src} alt={p.image.alt} className="sk-kr-cover" />
              )}
            </div>
          ) : null}
          <div className="sk-kr-setup__groups">
            {p.groups.map((group) => (
              <div key={group.title} className="sk-kr-setup__group">
                <h3>{group.title}</h3>
                <dl>
                  {group.items.map((item) => (
                    <div key={`${item.label}-${item.name}`}>
                      <dt>{item.label}</dt>
                      <dd>
                        {item.href ? (
                          <a href={item.href} {...(isExternal(item.href) ? { target: "_blank", rel: "sponsored noopener" } : {})}>
                            {item.name}
                          </a>
                        ) : (
                          item.name
                        )}
                        {item.spec ? <span>{item.spec}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {hasLinks && p.linkNote ? <p className="sk-kr-fine">{p.linkNote}</p> : null}
          </div>
          {p.settings.length || p.configCode ? (
            <aside className="sk-kr-setup__settings">
              <h3>{p.settingsTitle}</h3>
              {p.settings.length ? (
                <dl className="sk-kr-specs">
                  {p.settings.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {p.configCode ? (
                <div className="sk-kr-setup__config">
                  <p className="sk-kr-label">{p.configCode.label}</p>
                  <CopyCode code={p.configCode.code} copyLabel={p.copyLabel} copiedLabel={p.copiedLabel} />
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
