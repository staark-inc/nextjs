import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import verkstad from "../presets/verkstad.json" with { type: "json" };
import { Hero } from "./sections/Hero";
import { Promises } from "./sections/Promises";
import { PriceTable } from "./sections/PriceTable";
import { HighlightBand } from "./sections/HighlightBand";
import { ServiceBooking } from "./sections/ServiceBooking";
import { Faq } from "./sections/Faq";

/**
 * S-Hub Verkstad — child theme for car workshops. Inherits every S-Hub Light
 * section through `parentId: "light"`, overrides `hero` (with a licence-plate
 * box), and adds promises, a price table per car size, a seasonal highlight
 * band, FAQ and a service booking keyed on the registration number. `faq`
 * shares its props with S-Hub El.
 */
export const verkstadTheme: ThemeDefinition = {
  id: "verkstad",
  name: "S-Hub Verkstad",
  parentId: "light",
  presets: {
    verkstad: verkstad as ThemeDefinition["presets"][string],
  },
  defaultPreset: "verkstad",
  sections: {
    hero: Hero,
    promises: Promises,
    priceTable: PriceTable,
    highlightBand: HighlightBand,
    serviceBooking: ServiceBooking,
    faq: Faq,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const verkstadRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  verkstad: verkstadTheme,
};

export { Hero, Promises, PriceTable, HighlightBand, ServiceBooking, Faq };
export { buildServiceBooking, normalizePlate } from "./booking";
export default verkstadTheme;
export { default as verkstadManifest } from "./manifest";
