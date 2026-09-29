import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import skonhet from "../presets/skonhet.json" with { type: "json" };
import { Hero } from "./sections/Hero";
import { ServiceMenu } from "./sections/ServiceMenu";
import { Stylists } from "./sections/Stylists";
import { Lookbook } from "./sections/Lookbook";
import { BookingRequest } from "./sections/BookingRequest";
import { TreatmentCatalog } from "./sections/TreatmentCatalog";

/**
 * S-Hub Skönhet — child theme for hair & nail studios. It inherits every
 * S-Hub Light section through `parentId: "light"` (testimonials, cta, process…),
 * overrides `hero`, and adds: tabbed service menu, stylists, lookbook and a
 * stepwise booking request that lands in S-Hub Inbox as a booking.
 */
export const skonhetTheme: ThemeDefinition = {
  id: "skonhet",
  name: "S-Hub Skönhet",
  parentId: "light",
  presets: {
    skonhet: skonhet as ThemeDefinition["presets"][string],
  },
  defaultPreset: "skonhet",
  sections: {
    hero: Hero,
    serviceMenu: ServiceMenu,
    stylists: Stylists,
    lookbook: Lookbook,
    bookingRequest: BookingRequest,
    treatmentCatalog: TreatmentCatalog,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const skonhetRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  skonhet: skonhetTheme,
};

export {
  Hero,
  ServiceMenu,
  Stylists,
  Lookbook,
  BookingRequest,
  TreatmentCatalog,
};
export { buildBookingFields } from "./booking";
export default skonhetTheme;
export { default as skonhetManifest } from "./manifest";
