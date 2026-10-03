import { z } from "zod";

/** Small shared pieces for S-Hub Verkstad sections. */

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
    <header className={`sk-vk-head${tone === "dark" ? " sk-vk-head--dark" : ""}`}>
      {eyebrow ? <p className="sk-vk-label">{eyebrow}</p> : null}
      <h2>{heading}</h2>
      {intro ? <p className="sk-vk-head__intro">{intro}</p> : null}
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

const ICON_PATHS: Record<string, string> = {
  shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z M8.8 12l2.3 2.3 4.2-4.6",
  key: "M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z M12 12v9 M12 16h3 M12 19h2",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6 M9 12h6 M9 16h3",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-.6-.6-2.1 2.2-2.8Z",
  car: "M3 16v-4l2-5h14l2 5v4 M3 16h18v3h-3v-3 M6 16v3H3 M3 12h18 M7 13.5h.01 M17 13.5h.01",
  tire: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 3v5 M12 16v5 M3 12h5 M16 12h5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
  check: "m5 12 5 5 9-10",
};

export const ICON_NAMES = Object.keys(ICON_PATHS);

/** Line icon by name (shield, key, receipt, phone, wrench, car, tire, clock, check). */
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.check!;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
