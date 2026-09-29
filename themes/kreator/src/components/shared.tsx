import { z } from "zod";
import { detectPlatform, PLATFORM_LABELS, type Platform } from "../platform";

/** Small shared pieces for S-Hub Kreatör sections. */

export const linkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) });

/** Accepts a missing or half-filled link from the editor and treats it as absent. */
export const optionalLink = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  const label = typeof v.label === "string" ? v.label.trim() : "";
  const href = typeof v.href === "string" ? v.href.trim() : "";
  return label && href ? { label, href } : undefined;
}, linkSchema.optional());

export const imageSchema = z.object({ src: z.string().min(1), alt: z.string().default("") });

/** A platform link: platform is optional and guessed from the URL when missing. */
export const platformLinkSchema = z.object({
  href: z.string().min(1),
  label: z.string().optional(),
  platform: z.string().optional(),
  /** Short extra line, e.g. "Live acum", "184k urmăritori". */
  note: z.string().optional(),
});

export function resolvePlatform(link: { href: string; label?: string; platform?: string }): { platform: Platform; label: string } {
  const platform = detectPlatform(link.href, link.platform);
  return { platform, label: link.label?.trim() || PLATFORM_LABELS[platform] };
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function SectionHead({ eyebrow, heading, intro, align }: { eyebrow?: string; heading: string; intro?: string; align?: "center" }) {
  return (
    <header className={`sk-kr-head${align === "center" ? " sk-kr-head--center" : ""}`}>
      {eyebrow ? <p className="sk-kr-label">{eyebrow}</p> : null}
      <h2>{heading}</h2>
      {intro ? <p className="sk-kr-head__intro">{intro}</p> : null}
    </header>
  );
}

const GLYPHS: Record<Platform, string> = {
  youtube: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z M10 9v6l5-3-5-3Z",
  kick: "M12 12h.01 M8.5 8.5a5 5 0 0 0 0 7 M15.5 8.5a5 5 0 0 1 0 7 M5.6 5.6a9 9 0 0 0 0 12.8 M18.4 5.6a9 9 0 0 1 0 12.8",
  twitch: "M12 12h.01 M8.5 8.5a5 5 0 0 0 0 7 M15.5 8.5a5 5 0 0 1 0 7 M5.6 5.6a9 9 0 0 0 0 12.8 M18.4 5.6a9 9 0 0 1 0 12.8",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M17.5 6.5h.01",
  tiktok: "M9 18.5a3 3 0 1 1 0-6 M9 18.5a3 3 0 0 0 3-3V3 M12 3c.5 2.5 2.5 4.5 5 5",
  x: "M16 12a4 4 0 1 1-1.2-2.9 M16 8v5.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.6 7.2",
  discord: "M4 6h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4l-4 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z M18 10h2a2 2 0 0 1 2 2v5l-2-1.5",
  teamspeak: "M4 14v-2a8 8 0 0 1 16 0v2 M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Z M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z M17 18c0 1.5-1.5 3-5 3",
  facebook: "M14 21v-7h3l.5-3.5H14V8.5c0-1 .4-1.8 1.9-1.8H18V3.6A20 20 0 0 0 15.5 3.5C12.9 3.5 11 5 11 8v2.5H8V14h3v7",
  email: "M4 6h16v12H4z M4 7l8 6 8-6",
  shop: "M5 8h14l-1 12H6L5 8Z M9 8V6a3 3 0 0 1 6 0v2",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

export function PlatformIcon({ platform, size = 22 }: { platform: Platform; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={GLYPHS[platform]} />
    </svg>
  );
}

export function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7 M8 7h9v9" />
    </svg>
  );
}
