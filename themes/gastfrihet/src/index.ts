import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import gastfrihet from "../presets/gastfrihet.json" with { type: "json" };
import { Rooms } from "./sections/Rooms";
import { Amenities } from "./sections/Amenities";

/**
 * S-Hub Gästfrihet — child theme. It reuses every S-Hub Light section (hero,
 * services, process, testimonials, cta, contact) through `parentId: "light"`
 * and adds the guesthouse-specific rooms and amenities sections. The
 * `gastfrihet` preset here is the same JSON file shipped in the WordPress
 * child theme.
 */
export const gastfrihetTheme: ThemeDefinition = {
  id: "gastfrihet",
  name: "S-Hub Gästfrihet",
  parentId: "light",
  presets: {
    gastfrihet: gastfrihet as ThemeDefinition["presets"][string],
  },
  defaultPreset: "gastfrihet",
  sections: {
    rooms: Rooms,
    amenities: Amenities,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const gastfrihetRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  gastfrihet: gastfrihetTheme,
};

export { Rooms, Amenities };
export default gastfrihetTheme;
