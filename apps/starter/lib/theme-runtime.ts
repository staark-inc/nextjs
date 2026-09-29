import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import salongTheme, { salongRegistry } from "@staark/theme-salong";
import skonhetTheme, { skonhetRegistry } from "@staark/theme-skonhet";
import elTheme, { elRegistry } from "@staark/theme-el";
import kreatorTheme, { kreatorRegistry } from "@staark/theme-kreator";
import gastfrihetTheme, { gastfrihetRegistry } from "@staark/theme-gastfrihet";
import byraTheme, { byraRegistry } from "@staark/theme-byra";
import webbTheme, { webbRegistry } from "@staark/theme-webb";

export type ThemeRuntime = {
  id: string;
  name: string;
  description: string;
  theme: ThemeDefinition;
  registry?: Record<string, ThemeDefinition>;
};

const THEMES: Record<string, ThemeRuntime> = {
  light: {
    id: "light",
    name: lightTheme.name,
    description: "Flexible parent theme for local businesses and general websites.",
    theme: lightTheme,
    registry: { light: lightTheme },
  },
  salong: {
    id: "salong",
    name: salongTheme.name,
    description: "Salon theme with price lists and gallery sections.",
    theme: salongTheme,
    registry: salongRegistry,
  },
  skonhet: {
    id: "skonhet",
    name: skonhetTheme.name,
    description:
      "Hair & nail studio theme with service menu, stylists, lookbook and booking requests.",
    theme: skonhetTheme,
    registry: skonhetRegistry,
  },
  el: {
    id: "el",
    name: elTheme.name,
    description:
      "Electrician theme with credentials, deduction calculator, FAQ, emergency banner and quote requests.",
    theme: elTheme,
    registry: elRegistry,
  },
  kreator: {
    id: "kreator",
    name: kreatorTheme.name,
    description:
      "Streamer and creator theme with partner codes, stream schedule, gear, videos and socials.",
    theme: kreatorTheme,
    registry: kreatorRegistry,
  },
  gastfrihet: {
    id: "gastfrihet",
    name: gastfrihetTheme.name,
    description: "Hospitality theme with rooms and amenities sections.",
    theme: gastfrihetTheme,
    registry: gastfrihetRegistry,
  },
  byra: {
    id: "byra",
    name: byraTheme.name,
    description: "Agency and studio theme with cases, team, stats and logos.",
    theme: byraTheme,
    registry: byraRegistry,
  },
  webb: {
    id: "webb",
    name: webbTheme.name,
    description: "Staark web-agency theme with projects, pricing and service areas.",
    theme: webbTheme,
    registry: webbRegistry,
  },
};

export function listThemeRuntimes(): ThemeRuntime[] {
  return Object.values(THEMES);
}

export function getThemeRuntime(themeId: string): ThemeRuntime | undefined {
  return THEMES[themeId];
}

/**
 * Deployment env is the bootstrap/default family only. Once a site stores
 * theme.family in persistent content, that value owns the runtime selection.
 */
export function configuredThemeId(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const requested = env.STAARK_THEME?.trim() || "salong";
  return THEMES[requested] ? requested : "salong";
}

export function resolveThemeRuntime(themeId?: string): ThemeRuntime {
  const requested = themeId?.trim();
  if (requested && THEMES[requested]) return THEMES[requested]!;
  return THEMES[configuredThemeId()] ?? THEMES.salong!;
}
