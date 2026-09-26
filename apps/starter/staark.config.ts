import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme, { SiteHeader, SiteFooter } from "@staark/theme-light";
import salongTheme, { salongRegistry } from "@staark/theme-salong";
import gastfrihetTheme, { gastfrihetRegistry } from "@staark/theme-gastfrihet";
import byraTheme, { byraRegistry } from "@staark/theme-byra";
import webbTheme, { webbRegistry } from "@staark/theme-webb";

/**
 * Per-client theme selection. In this "one deploy per client" model the theme
 * is chosen here (or via STAARK_THEME) and a redesign is a redeploy. Runtime
 * content may come from the local deployment or Staark Hub; theme code remains
 * deployment-owned while presets and token overrides are site configuration.
 */
const THEMES: Record<string, { theme: ThemeDefinition; registry?: Record<string, ThemeDefinition> }> = {
  light: { theme: lightTheme },
  salong: { theme: salongTheme, registry: salongRegistry },
  gastfrihet: { theme: gastfrihetTheme, registry: gastfrihetRegistry },
  byra: { theme: byraTheme, registry: byraRegistry },
  webb: { theme: webbTheme, registry: webbRegistry },
};

const selected = process.env.STAARK_THEME?.trim() || "salong";
const active = THEMES[selected] ?? THEMES.salong!;

export const theme = active.theme;
export const themeRegistry = active.registry;
export { SiteHeader, SiteFooter };
