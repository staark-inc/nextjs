import type { ThemeManifest } from "@staark/theme-kit";

export const skonhetManifest = {
  id: "skonhet",
  name: "S-Hub Skönhet",
  parentId: "light",
  blocks: [
    "hero",
    "treatmentCatalog",
    "serviceMenu",
    "stylists",
    "lookbook",
    "bookingRequest",
  ],
  dataSources: {
    "services": "services.json",
  },
} as const satisfies ThemeManifest;

export default skonhetManifest;
