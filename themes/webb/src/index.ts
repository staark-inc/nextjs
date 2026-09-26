import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import webb from "../presets/webb.json" with { type: "json" };
import { FeaturedProject } from "./sections/FeaturedProject";
import { Pricing } from "./sections/Pricing";
import { ServiceAreas } from "./sections/ServiceAreas";

/**
 * S-Hub Webb — child theme in the Staark house style (staarkinc.com). Reuses
 * every S-Hub Light section (hero, services, process, testimonials, cta,
 * contact) through `parentId: "light"` and adds the web-agency sections:
 * featured project, productized pricing and local service areas. The `webb`
 * preset is the Staark house palette (the WordPress "scandinavian" direction).
 */
export const webbTheme: ThemeDefinition = {
  id: "webb",
  name: "S-Hub Webb",
  parentId: "light",
  presets: {
    webb: webb as ThemeDefinition["presets"][string],
  },
  defaultPreset: "webb",
  sections: {
    featuredProject: FeaturedProject,
    pricing: Pricing,
    serviceAreas: ServiceAreas,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const webbRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  webb: webbTheme,
};

export { FeaturedProject, Pricing, ServiceAreas };
export default webbTheme;
