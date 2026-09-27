import type { ThemeDefinition } from "@staark/theme-kit";
import scandinavian from "../presets/scandinavian.json" with { type: "json" };
import localBusiness from "../presets/local-business.json" with { type: "json" };
import { Hero } from "./sections/Hero";
import { Freeform } from "./sections/Freeform";
import { Services } from "./sections/Services";
import { Process } from "./sections/Process";
import { Testimonials } from "./sections/Testimonials";
import { Cta } from "./sections/Cta";
import { Contact } from "./sections/Contact";

/**
 * S-Hub Light — the parent theme. Child themes (Salong, Bygg, Gästfrihet) set
 * `parentId: "light"` and reuse these sections, adding their own on top.
 */
export const lightTheme: ThemeDefinition = {
  id: "light",
  name: "S-Hub Light",
  presets: {
    scandinavian: scandinavian as ThemeDefinition["presets"][string],
    "local-business": localBusiness as ThemeDefinition["presets"][string],
  },
  defaultPreset: "scandinavian",
  sections: {
    hero: Hero,
    freeform: Freeform,
    services: Services,
    process: Process,
    testimonials: Testimonials,
    cta: Cta,
    contact: Contact,
  },
};

export { SiteHeader, SiteFooter } from "./components/chrome";
export { Container, Button, Eyebrow, siteCta } from "./components/primitives";
export { Hero, Freeform, Services, Process, Testimonials, Cta, Contact };
export default lightTheme;
