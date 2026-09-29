import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import el from "../presets/el.json" with { type: "json" };
import { Hero } from "./sections/Hero";
import { Process } from "./sections/Process";
import { Credentials } from "./sections/Credentials";
import { DeductionCalculator } from "./sections/DeductionCalculator";
import { Faq } from "./sections/Faq";
import { QuoteRequest } from "./sections/QuoteRequest";
import { EmergencyBanner } from "./sections/EmergencyBanner";

/**
 * S-Hub El — child theme for electricians. Inherits every S-Hub Light section
 * through `parentId: "light"`, overrides `hero` and `process`, and adds:
 * credentials (with a link to the public register), a ROT + grön teknik
 * calculator, FAQ with structured data, a stepwise quote request and the jour
 * banner. `quoteRequest` and `emergencyBanner` share their props with S-Hub
 * Hantverk, so content moves between the two themes unchanged.
 */
export const elTheme: ThemeDefinition = {
  id: "el",
  name: "S-Hub El",
  parentId: "light",
  presets: {
    el: el as ThemeDefinition["presets"][string],
  },
  defaultPreset: "el",
  sections: {
    hero: Hero,
    process: Process,
    credentials: Credentials,
    deductionCalculator: DeductionCalculator,
    faq: Faq,
    quoteRequest: QuoteRequest,
    emergencyBanner: EmergencyBanner,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const elRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  el: elTheme,
};

export { Hero, Process, Credentials, DeductionCalculator, Faq, QuoteRequest, EmergencyBanner };
export { computeDeduction, formatKr } from "./deduction";
export default elTheme;
export { default as elManifest } from "./manifest";
