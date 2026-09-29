import { z } from "zod";
export { withParam } from "../url";

/** Small shared pieces for S-Hub Skönhet sections. */

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

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function SectionHead({ eyebrow, heading, intro, align }: { eyebrow?: string; heading: string; intro?: string; align?: "center" }) {
  return (
    <header className={`sk-sb-head${align === "center" ? " sk-sb-head--center" : ""}`}>
      {eyebrow ? <p className="sk-sb-eyebrow">{eyebrow}</p> : null}
      <h2>{heading}</h2>
      {intro ? <p className="sk-sb-head__intro">{intro}</p> : null}
    </header>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
