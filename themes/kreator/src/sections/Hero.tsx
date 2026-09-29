import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { imageSchema, isExternal, PlatformIcon, platformLinkSchema, resolvePlatform } from "../components/shared";
import { CopyCode } from "../components/CopyCode";

const schema = z.object({
  eyebrow: z.string().optional(),
  /** The creator's name or handle, shown large. */
  heading: z.string(),
  intro: z.string().optional(),
  avatar: imageSchema.optional(),
  /** Status tag on the avatar, e.g. "Live pe Kick". Static text: set it from /admin or the Hub. */
  status: z.string().optional(),
  statusLive: z.boolean().default(false),
  /** Main watch/follow buttons (YouTube, Kick, Twitch …). The first one is highlighted. */
  platforms: z.array(platformLinkSchema).default([]),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  /** Featured creator code, e.g. { label: "Nu uita de codul", code: "NOVA" }. */
  code: z
    .object({
      label: z.string().default("Codul meu"),
      code: z.string().min(1),
      note: z.string().optional(),
      copyLabel: z.string().default("Copiază"),
      copiedLabel: z.string().default("Copiat!"),
    })
    .optional(),
});

/**
 * Kreatör hero — overrides the S-Hub Light hero. Creator name, avatar with a
 * status tag, follower stats, the main platform buttons and a featured code
 * with a copy button. Block type: "hero".
 */
export const Hero: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const HostImage = ctx.image;
  const priority = (ctx.blockIndex ?? Infinity) <= 1;

  return (
    <section className="sk-kr-hero">
      <Container wide>
        <div className="sk-kr-hero__grid">
          <div className="sk-kr-hero__media">
            <div className="sk-kr-hero__avatar">
              {p.avatar ? (
                HostImage ? (
                  <HostImage src={p.avatar.src} alt={p.avatar.alt} fill sizes="(max-width: 900px) 60vw, 420px" priority={priority} eager={priority} className="sk-kr-cover" />
                ) : (
                  <img src={p.avatar.src} alt={p.avatar.alt} className="sk-kr-cover" />
                )
              ) : null}
              {p.status ? (
                <span className={`sk-kr-status${p.statusLive ? " sk-kr-status--live" : ""}`}>
                  <span className="sk-kr-status__dot" aria-hidden />
                  {p.status}
                </span>
              ) : null}
            </div>
            {p.stats.length ? (
              <dl className="sk-kr-stats">
                {p.stats.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <div className="sk-kr-hero__body">
            {p.eyebrow ? <p className="sk-kr-label">{p.eyebrow}</p> : null}
            <h1 className="sk-kr-hero__title">{p.heading}</h1>
            {p.intro ? <p className="sk-kr-hero__intro">{p.intro}</p> : null}

            {p.platforms.length ? (
              <ul className="sk-kr-hero__platforms">
                {p.platforms.map((link, i) => {
                  const { platform, label } = resolvePlatform(link);
                  return (
                    <li key={`${link.href}-${i}`}>
                      <a
                        className={`sk-kr-platform${i === 0 ? " sk-kr-platform--primary" : ""}`}
                        href={link.href}
                        {...(isExternal(link.href) ? { target: "_blank", rel: "noopener" } : {})}
                      >
                        <PlatformIcon platform={platform} />
                        <span className="sk-kr-platform__text">
                          <strong>{label}</strong>
                          {link.note ? <span>{link.note}</span> : null}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {p.code ? (
              <div className="sk-kr-hero__code">
                <p className="sk-kr-hero__code-label">{p.code.label}</p>
                <CopyCode code={p.code.code} copyLabel={p.code.copyLabel} copiedLabel={p.code.copiedLabel} size="lg" />
                {p.code.note ? <p className="sk-kr-hero__code-note">{p.code.note}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
};
