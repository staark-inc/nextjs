import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme, { SiteHeader, SiteFooter } from "@staark/theme-light";
import salongTheme, { salongRegistry } from "@staark/theme-salong";
import gastfrihetTheme, { gastfrihetRegistry } from "@staark/theme-gastfrihet";

/**
 * Per-client theme selection. In this "one deploy per client" model the theme
 * is chosen here (or via STAARK_THEME) and a redesign is a redeploy. The Hub
 * still controls all content, the active preset and token overrides at runtime.
 */
const THEMES: Record<string, { theme: ThemeDefinition; registry?: Record<string, ThemeDefinition> }> = {
  light: { theme: lightTheme },
  salong: { theme: salongTheme, registry: salongRegistry },
  gastfrihet: { theme: gastfrihetTheme, registry: gastfrihetRegistry },
};

const selected = process.env.STAARK_THEME?.trim() || "salong";
const active = THEMES[selected] ?? THEMES.salong!;

export const theme = active.theme;
export const themeRegistry = active.registry;
export { SiteHeader, SiteFooter };
