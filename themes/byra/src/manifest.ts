import type { ThemeManifest } from "@staark/theme-kit";

export const byraManifest = {
  id: "byra",
  name: "S-Hub Byrå",
  parentId: "light",
  blocks: [
    "stats",
    "caseStudies",
    "team",
    "logos",
  ],
} as const satisfies ThemeManifest;

export default byraManifest;
