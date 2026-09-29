import type { ThemeManifest } from "@staark/theme-kit";

export const lightManifest = {
  id: "light",
  name: "S-Hub Light",
  blocks: [
    "freeform",
    "cards",
    "linkColumns",
    "projectsShowcase",
    "hero",
    "services",
    "process",
    "testimonials",
    "cta",
    "contact",
    "bookingForm",
  ],
} as const satisfies ThemeManifest;

export default lightManifest;
