import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import kreator from "../presets/kreator.json" with { type: "json" };
import { Hero } from "./sections/Hero";
import { PartnerCodes } from "./sections/PartnerCodes";
import { StreamSchedule } from "./sections/StreamSchedule";
import { GearSetup } from "./sections/GearSetup";
import { VideoGrid } from "./sections/VideoGrid";
import { SocialLinks } from "./sections/SocialLinks";

/**
 * S-Hub Kreatör — child theme for streamers and content creators. Inherits
 * every S-Hub Light section through `parentId: "light"` (contact for business
 * enquiries, testimonials, cta …), overrides `hero`, and adds partner codes,
 * stream schedule, gear setup, video grid and social links.
 */
export const kreatorTheme: ThemeDefinition = {
  id: "kreator",
  name: "S-Hub Kreatör",
  parentId: "light",
  presets: {
    kreator: kreator as ThemeDefinition["presets"][string],
  },
  defaultPreset: "kreator",
  sections: {
    hero: Hero,
    partnerCodes: PartnerCodes,
    streamSchedule: StreamSchedule,
    gearSetup: GearSetup,
    videoGrid: VideoGrid,
    socialLinks: SocialLinks,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const kreatorRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  kreator: kreatorTheme,
};

export { Hero, PartnerCodes, StreamSchedule, GearSetup, VideoGrid, SocialLinks };
export { detectPlatform, formatCount, weekdayIndex, PLATFORMS } from "./platform";
export default kreatorTheme;
export { default as kreatorManifest } from "./manifest";
