import type { ThemeManifest } from "@staark/theme-kit";

export const verkstadManifest = {
  id: "verkstad",
  name: "S-Hub Verkstad",
  parentId: "light",
  blocks: [
    "hero",
    "promises",
    "priceTable",
    "highlightBand",
    "serviceBooking",
    "faq",
  ],
} as const satisfies ThemeManifest;

export default verkstadManifest;
