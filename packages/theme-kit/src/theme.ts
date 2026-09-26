import type { ComponentType } from "react";
import type { TokenOverrides } from "@staark/core";

/**
 * A preset is exactly the JSON shape used by the WordPress theme presets
 * (themes/<name>/presets/<id>.json): tokens (colors/typography/radius/layout) plus a
 * `components` map that names the visual variant for header, hero, cards, etc.
 * The same files can be copied between the WordPress and Next.js stacks.
 */
export type Preset = {
  id: string;
  name: string;
  description?: string;
  version?: number;
  tokens: {
    colors?: Record<string, string>;
    typography?: Record<string, string>;
    radius?: Record<string, string>;
    layout?: Record<string, string>;
  };
  components?: Record<string, string>;
};

/** Props every section receives from the renderer. */
export type SectionContext = {
  /** Absolute site URL, contact, navigation etc. — the whole SiteSettings object. */
  site: import("@staark/core").SiteSettings;
  /** Component variants from the active preset (header: "glass", hero: "split", ...). */
  components: Record<string, string>;
};

export type SectionComponent<P = Record<string, unknown>> = ComponentType<{ props: P; ctx: SectionContext }>;

export type ThemeDefinition = {
  id: string;
  name: string;
  /** parentId lets a child theme inherit its parent's section registry. */
  parentId?: string;
  presets: Record<string, Preset>;
  defaultPreset: string;
  sections: Record<string, SectionComponent<any>>;
};

/** camelCase / nested token key → CSS custom property name: primaryDark → --sk-color-primary-dark. */
function cssVarName(group: string, key: string): string {
  const kebab = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return `--sk-${group}-${kebab}`;
}

const GROUP_PREFIX: Record<string, string> = {
  colors: "color",
  typography: "font",
  radius: "radius",
  layout: "layout",
};

/**
 * Flatten a preset's tokens (merged with per-site overrides from the Hub) into
 * the CSS variables the themes consume. Returned as a style object for :root.
 */
export function presetToCssVars(preset: Preset, overrides?: TokenOverrides): Record<string, string> {
  const vars: Record<string, string> = {};
  const groups = ["colors", "typography", "radius", "layout"] as const;
  for (const group of groups) {
    const merged = { ...(preset.tokens[group] ?? {}), ...(overrides?.[group] ?? {}) };
    for (const [key, value] of Object.entries(merged)) {
      vars[cssVarName(GROUP_PREFIX[group] ?? group, key)] = String(value);
    }
  }
  return vars;
}

export function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

export function resolvePreset(theme: ThemeDefinition, presetId?: string): Preset {
  if (presetId && theme.presets[presetId]) return theme.presets[presetId];
  return theme.presets[theme.defaultPreset]!;
}
