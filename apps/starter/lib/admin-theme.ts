import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  preset?: string;
  overrides?: ThemeOverrides;
  components?: Record<string, string>;
};

export function themesRoot(): string {
  return path.resolve(process.cwd(), "../../themes");
}

export function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export function siteFile(root = contentRoot()): string {
  return path.join(root, "site.json");
}

export async function readSite(root = contentRoot()): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(siteFile(root), "utf8")) as Record<string, unknown>;
}

export async function writeSite(site: Record<string, unknown>, root = contentRoot()): Promise<void> {
  await writeFile(siteFile(root), JSON.stringify(site, null, 2) + "\n", "utf8");
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
    preset: typeof theme.preset === "string" ? theme.preset : undefined,
    overrides: asTokens(theme.overrides),
    components: asStringRecord(theme.components),
  };
}

export async function readThemePresets(themeId: string): Promise<AdminThemePreset[]> {
  if (!/^[a-z0-9-]+$/.test(themeId)) return [];
  const dir = path.join(themesRoot(), themeId, "presets");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
  } catch {
    return [];
  }

  const presets: AdminThemePreset[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(dir, file), "utf8")) as Record<string, unknown>;
      const id = typeof raw.id === "string" && raw.id ? raw.id : file.replace(/\.json$/, "");
      presets.push({
        id,
        name: typeof raw.name === "string" && raw.name ? raw.name : id,
        description: typeof raw.description === "string" ? raw.description : "",
        tokens: asTokens(raw.tokens),
        components: asStringRecord(raw.components),
      });
    } catch {
      // Skip invalid preset files; the theme package remains loadable with its valid presets.
    }
  }
  return presets;
}

export async function themeContentRoot(themeId: string): Promise<{ root: string; relative: string }> {
  const relative = `content/${themeId}`;
  const candidate = path.resolve(process.cwd(), relative);
  try {
    await access(candidate);
    return { root: candidate, relative };
  } catch {
    return { root: path.resolve(process.cwd(), "content"), relative: "content" };
  }
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
