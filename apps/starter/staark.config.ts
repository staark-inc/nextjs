import { SiteHeader, SiteFooter } from "@staark/theme-light";
import { resolveThemeRuntime } from "@/lib/theme-runtime";

/**
 * Compatibility exports for code that still expects a deployment-default
 * theme. Public rendering resolves the persisted site.theme.family at request
 * time; STAARK_THEME is only the bootstrap fallback.
 */
const active = resolveThemeRuntime();

export const theme = active.theme;
export const themeRegistry = active.registry;
export { resolveThemeRuntime };
export { getThemeRuntime, listThemeRuntimes } from "@/lib/theme-runtime";
export { SiteHeader, SiteFooter };
