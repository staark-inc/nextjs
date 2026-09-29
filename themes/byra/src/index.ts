import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import byra from "../presets/byra.json" with { type: "json" };
import { Stats } from "./sections/Stats";
import { CaseStudies } from "./sections/CaseStudies";
import { Team } from "./sections/Team";
import { Logos } from "./sections/Logos";

/**
 * S-Hub Byrå — child theme for agencies and studios. It reuses every S-Hub Light
 * section (hero, services, process, testimonials, cta, contact) through
 * `parentId: "light"` and adds the agency-specific stats, case studies, team and
 * client-logo sections. Bold editorial preset (`byra`).
 */
export const byraTheme: ThemeDefinition = {
  id: "byra",
  name: "S-Hub Byrå",
  parentId: "light",
  presets: {
    byra: byra as ThemeDefinition["presets"][string],
  },
  defaultPreset: "byra",
  sections: {
    stats: Stats,
    caseStudies: CaseStudies,
    team: Team,
    logos: Logos,
  },
};

/** Registry to pass to BlockRenderer so parent sections resolve. */
export const byraRegistry: Record<string, ThemeDefinition> = {
  light: lightTheme,
  byra: byraTheme,
};

export { Stats, CaseStudies, Team, Logos };
export default byraTheme;
export { default as byraManifest } from "./manifest";
