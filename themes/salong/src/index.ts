import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import salong from "../presets/salong.json" with { type: "json" };
import { PriceList } from "./sections/PriceList";
import { Gallery } from "./sections/Gallery";

/**
 * S-Hub Salong — child theme. It reuses every S-Hub Light section (hero,
 * services, process, testimonials, cta, contact) through `parentId: "light"`
 * and adds the salon-specific price list and gallery. The `salong` preset here
 * is the same JSON file shipped in the WordPress child theme.
 */
export const salongTheme: ThemeDefinition = {
  id: "salong",
  name: "S-Hub Salong",
  parentId: "light",
  presets: {
    salong: salong as ThemeDefinition["presets"][string],
  },
  defaultPreset: "salong",
  sections: {
    priceList: PriceList,
    gallery: Gallery,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const salongRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  salong: salongTheme,
};

export { PriceList, Gallery };
export default salongTheme;
export { default as salongManifest } from "./manifest";
