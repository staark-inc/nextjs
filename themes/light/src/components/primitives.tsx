import type { SiteSettings } from "@staark/core";
import type { SectionContext } from "@staark/theme-kit";
import { z } from "zod";

/** Small shared bits used across S-Hub Light sections. */

export function Container({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "sk-container sk-container--wide" : "sk-container"}>{children}</div>;
}

export function Button({ href, children, variant = "primary", ctx }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost"; ctx: SectionContext }) {
  return (
    <a className={`sk-btn sk-btn--${variant} sk-btn--${ctx.components.buttons ?? "solid"}`} href={href}>
      {children}
    </a>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="sk-eyebrow">{children}</p>;
}

export const linkSchema = z.object({ label: z.string(), href: z.string() });

/** Resolve the site's primary CTA, used by hero and CTA sections when none is given. */
export function siteCta(site: SiteSettings) {
  return site.navigation.cta ?? { label: "Kontakta oss", href: "/kontakt" };
}
