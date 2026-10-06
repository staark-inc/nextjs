import type { ThemeDefinition } from "@staark/theme-kit";
import { customBasePresets } from "./presets.ts";
import { Hero, Text, Services, Projects, Stats, Shortcuts, Cta, ImageText, Faq, Gallery, ContactFormSection } from "./sections/index";

export const customBaseTheme: ThemeDefinition = {
  id: "custom-base", name: "Custom Base", presets: customBasePresets, defaultPreset: "studio",
  componentVariants: { hero: ["editorial"], header: ["minimal"], footer: ["editorial"] },
  sections: { contactForm: ContactFormSection, imageText: ImageText, faq: Faq, gallery: Gallery, hero: Hero, text: Text, services: Services, projectsShowcase: Projects, stats: Stats, shortcuts: Shortcuts, cta: Cta },
};
export { CustomSiteHeader, CustomSiteFooter } from "./components/chrome";
export { Container, Button, Eyebrow } from "./components/primitives";
export { Hero, Text, Services, Projects, Stats, Shortcuts, Cta, ImageText, Faq, Gallery, ContactFormSection };
export { customBaseBlockDefinitions, customBaseShortcuts, createCustomBaseBlock } from "./blocks.ts";
export { customBasePresets } from "./presets.ts";
export default customBaseTheme;
