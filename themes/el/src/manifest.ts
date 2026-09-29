import type { ThemeManifest } from "@staark/theme-kit";

export const elManifest = {
  id: "el",
  name: "S-Hub El",
  parentId: "light",
  blocks: [
    "hero",
    "process",
    "credentials",
    "deductionCalculator",
    "faq",
    "quoteRequest",
    "emergencyBanner",
  ],
} as const satisfies ThemeManifest;

export default elManifest;
