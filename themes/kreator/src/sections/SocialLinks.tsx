import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { ArrowIcon, isExternal, PlatformIcon, platformLinkSchema, resolvePlatform, SectionHead } from "../components/shared";
import { formatCount } from "../platform";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  links: z
    .array(
      platformLinkSchema.extend({
        handle: z.string().optional(),
        /** Followers as a number (formatted to 184k) or as ready text. */
        count: z.union([z.number(), z.string()]).optional(),
        countLabel: z.string().optional(),
      }),
    )
    .default([]),
});

/**
 * Social links — every channel as a tile with handle and follower count.
 * Platform is guessed from the URL (or set explicitly); icons are generic
 * glyphs next to the platform name. Block type: "socialLinks".
 */
export const SocialLinks: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  if (!p.links.length) return null;
  return (
    <section className="sk-section sk-kr-socials" id="social">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} align="center" />
        <ul className="sk-kr-socials__grid">
          {p.links.map((link, i) => {
            const { platform, label } = resolvePlatform(link);
            const count = typeof link.count === "number" ? formatCount(link.count) : link.count;
            return (
              <li key={`${link.href}-${i}`}>
                <a className="sk-kr-social" data-platform={platform} href={link.href} {...(isExternal(link.href) ? { target: "_blank", rel: "noopener me" } : {})}>
                  <span className="sk-kr-social__icon">
                    <PlatformIcon platform={platform} size={24} />
                  </span>
                  <span className="sk-kr-social__text">
                    <strong>{label}</strong>
                    {link.handle ? <span>{link.handle}</span> : null}
                  </span>
                  {count ? (
                    <span className="sk-kr-social__count">
                      {count}
                      {link.countLabel ? <small>{link.countLabel}</small> : null}
                    </span>
                  ) : null}
                  <span className="sk-kr-social__arrow">
                    <ArrowIcon />
                  </span>
                  {link.note ? <span className="sk-kr-social__note">{link.note}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
};
