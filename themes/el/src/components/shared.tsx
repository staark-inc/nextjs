import { z } from "zod";

/** Small shared pieces for S-Hub El sections. */

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

export function SectionHead({ eyebrow, heading, intro, tone }: { eyebrow?: string; heading: string; intro?: string; tone?: "dark" }) {
  return (
    <header className={`sk-el-head${tone === "dark" ? " sk-el-head--dark" : ""}`}>
      {eyebrow ? <p className="sk-el-label">{eyebrow}</p> : null}
      <h2>{heading}</h2>
      {intro ? <p className="sk-el-head__intro">{intro}</p> : null}
    </header>
  );
}

type IconProps = { size?: number };

export function PhoneIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function CheckIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function BoltIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 2 4 13.5h6.2L9 22l10-12.2h-6.3L13.5 2Z" />
    </svg>
  );
}

export function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.3 2.3 4.2-4.6" strokeLinecap="round" />
    </svg>
  );
}
