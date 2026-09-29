import type { ThemeManifest } from "@staark/theme-kit";

export const webbManifest = {
  id: "webb",
  name: "S-Hub Webb",
  parentId: "light",
  blocks: [
    "featuredProject",
    "pricing",
    "serviceAreas",
  ],
} as const satisfies ThemeManifest;

export default webbManifest;
