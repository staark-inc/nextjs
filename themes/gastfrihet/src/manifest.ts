import type { ThemeManifest } from "@staark/theme-kit";

export const gastfrihetManifest = {
  id: "gastfrihet",
  name: "S-Hub Gästfrihet",
  parentId: "light",
  blocks: [
    "rooms",
    "amenities",
  ],
} as const satisfies ThemeManifest;

export default gastfrihetManifest;
