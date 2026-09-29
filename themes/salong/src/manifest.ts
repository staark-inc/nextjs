import type { ThemeManifest } from "@staark/theme-kit";

export const salongManifest = {
  id: "salong",
  name: "S-Hub Salong",
  parentId: "light",
  blocks: [
    "priceList",
    "gallery",
  ],
} as const satisfies ThemeManifest;

export default salongManifest;
