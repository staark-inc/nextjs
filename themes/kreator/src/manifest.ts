import type { ThemeManifest } from "@staark/theme-kit";

export const kreatorManifest = {
  id: "kreator",
  name: "S-Hub Kreatör",
  parentId: "light",
  blocks: [
    "hero",
    "partnerCodes",
    "streamSchedule",
    "gearSetup",
    "videoGrid",
    "socialLinks",
  ],
} as const satisfies ThemeManifest;

export default kreatorManifest;
