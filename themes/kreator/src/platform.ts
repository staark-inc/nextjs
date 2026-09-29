/**
 * Platform helpers, kept pure so they can be tested. Icons are generic glyphs
 * (play, broadcast, camera …) with the platform name as text, not brand logos.
 */

export const PLATFORMS = ["youtube", "kick", "twitch", "instagram", "tiktok", "x", "discord", "teamspeak", "facebook", "email", "shop", "link"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  kick: "Kick",
  twitch: "Twitch",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  discord: "Discord",
  teamspeak: "TeamSpeak",
  facebook: "Facebook",
  email: "E-mail",
  shop: "Shop",
  link: "Link",
};

const HOSTS: [RegExp, Platform][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)kick\.com$/, "kick"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(x|twitter)\.com$/, "x"],
  [/(^|\.)discord\.(gg|com)$/, "discord"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, "facebook"],
];

/** Guess the platform from a link; an explicit choice in the content always wins. */
export function detectPlatform(href: string, explicit?: string): Platform {
  if (explicit && (PLATFORMS as readonly string[]).includes(explicit)) return explicit as Platform;
  const value = href.trim().toLowerCase();
  if (value.startsWith("mailto:")) return "email";
  if (value.startsWith("ts3server:") || value.startsWith("teamspeak:")) return "teamspeak";
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    for (const [pattern, platform] of HOSTS) if (pattern.test(host)) return platform;
  } catch {
    /* relative or malformed link */
  }
  return "link";
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Monday-based weekday index (0 = Monday … 6 = Sunday) of `date` in `timeZone`. */
export function weekdayIndex(date: Date, timeZone: string): number {
  let short: string;
  try {
    short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(date).toLowerCase().slice(0, 3);
  } catch {
    short = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toLowerCase().slice(0, 3);
  }
  const sundayBased = DAYS.indexOf(short as (typeof DAYS)[number]);
  return (sundayBased + 6) % 7;
}

/** Compact follower counts: 1234 → "1,2k", 2500000 → "2,5M" (Romanian/Swedish decimal comma). */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1000) return String(Math.round(n));
  const [value, unit] = n >= 1_000_000 ? [n / 1_000_000, "M"] : [n / 1000, "k"];
  const rounded = value >= 100 ? Math.round(value).toString() : (Math.round(value * 10) / 10).toString();
  return `${rounded.replace(".", ",")}${unit}`;
}
