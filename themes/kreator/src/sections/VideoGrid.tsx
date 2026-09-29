import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { isExternal, optionalLink, PlatformIcon, SectionHead } from "../components/shared";
import { detectPlatform } from "../platform";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  videos: z
    .array(
      z.object({
        title: z.string(),
        href: z.string(),
        thumbnail: z.string().optional(),
        duration: z.string().optional(),
        meta: z.string().optional(),
        platform: z.string().optional(),
      }),
    )
    .default([]),
  cta: optionalLink,
});

/**
 * Video grid — latest videos or clips as link cards (thumbnail, duration,
 * views/date). Links open the platform; nothing is embedded, so no third-party
 * player loads until the visitor clicks. The first video is shown large.
 * Block type: "videoGrid".
 */
export const VideoGrid: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.videos.length) return null;
  return (
    <section className="sk-section sk-kr-videos" id="videoclipuri">
      <Container>
        <div className="sk-kr-videos__head">
          <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
          {p.cta ? (
            <a className="sk-kr-btn sk-kr-btn--ghost" href={p.cta.href} {...(isExternal(p.cta.href) ? { target: "_blank", rel: "noopener" } : {})}>
              {p.cta.label}
            </a>
          ) : null}
        </div>
        <ul className="sk-kr-videos__grid">
          {p.videos.map((v, i) => {
            const platform = detectPlatform(v.href, v.platform);
            return (
              <li key={`${v.href}-${i}`} className={`sk-kr-video${i === 0 ? " sk-kr-video--featured" : ""}`}>
                <a className="sk-kr-video__link" href={v.href} {...(isExternal(v.href) ? { target: "_blank", rel: "noopener" } : {})}>
                  <span className="sk-kr-video__thumb">
                    {v.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" decoding="async" /> : null}
                    <span className="sk-kr-video__play" aria-hidden>
                      <PlatformIcon platform={platform === "link" ? "youtube" : platform} size={i === 0 ? 30 : 24} />
                    </span>
                    {v.duration ? <span className="sk-kr-video__dur">{v.duration}</span> : null}
                  </span>
                  <span className="sk-kr-video__title">{v.title}</span>
                  {v.meta ? <span className="sk-kr-video__meta">{v.meta}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
};
