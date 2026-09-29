import { getThemeRuntime } from "@/lib/theme-runtime";
import {
  readAdminSiteSettings,
  writeAdminSiteSettings,
} from "@/lib/admin-site-settings";

export type ThemeTokens = {
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  radius?: Record<string, string>;
  layout?: Record<string, string>;
};

export type ThemeOverrides = ThemeTokens;

export type AdminThemePreset = {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
  components: Record<string, string>;
};

export type SiteThemeConfig = {
  family?: string;
  preset?: string;
  overrides?: ThemeOverrides;
  components?: Record<string, string>;
};

export async function readSite(): Promise<Record<string, unknown>> {
  const site = await readAdminSiteSettings();
  return site as unknown as Record<string, unknown>;
}

export async function writeSite(site: Record<string, unknown>): Promise<void> {
  await writeAdminSiteSettings(site);
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

function asTokens(value: unknown): ThemeTokens {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    colors: asStringRecord(record.colors),
    typography: asStringRecord(record.typography),
    radius: asStringRecord(record.radius),
    layout: asStringRecord(record.layout),
  };
}

export function readSiteTheme(site: Record<string, unknown>): SiteThemeConfig {
  const raw = site.theme;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const theme = raw as Record<string, unknown>;
  return {
    family: typeof theme.family === "string" ? theme.family : undefined,
    preset: typeof theme.preset === "string" ? theme.preset : undefined,
    overrides: asTokens(theme.overrides),
    components: asStringRecord(theme.components),
  };
}

export async function readThemePresets(themeId: string): Promise<AdminThemePreset[]> {
  if (!/^[a-z0-9-]+$/.test(themeId)) return [];
  const runtime = getThemeRuntime(themeId);
  if (!runtime) return [];

  return Object.values(runtime.theme.presets)
    .map((preset) => ({
      id: preset.id,
      name: preset.name || preset.id,
      description: preset.description ?? "",
      tokens: asTokens(preset.tokens),
      components: asStringRecord(preset.components),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function cleanRecord(input: unknown, maxLength = 300): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) continue;
    out[key] = trimmed;
  }
  return out;
}

export function sanitizeOverrides(input: unknown): ThemeOverrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const groups = ["colors", "typography", "radius", "layout"] as const;
  const out: ThemeOverrides = {};
  for (const group of groups) {
    const cleaned = cleanRecord(record[group]);
    if (Object.keys(cleaned).length) out[group] = cleaned;
  }
  return out;
}

export function sanitizeComponents(input: unknown): Record<string, string> {
  return cleanRecord(input, 80);
}
