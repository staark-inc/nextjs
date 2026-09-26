import { access, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  contentRoot,
  readSite,
  readThemePresets,
  sanitizeComponents,
  sanitizeOverrides,
  writeSite,
  type AdminThemePreset,
  type ThemeOverrides,
} from "@/lib/admin-theme";

export const THEME_STUDIO_SCHEMA = "staark-theme/v1" as const;
export const THEME_STUDIO_VERSION = 1 as const;
export const BUILT_IN_THEME_IDS = ["light", "salong", "gastfrihet"] as const;

export type BuiltInThemeId = (typeof BUILT_IN_THEME_IDS)[number];

export type ThemeStudioDocument = {
  schema: typeof THEME_STUDIO_SCHEMA;
  version: typeof THEME_STUDIO_VERSION;
  id: string;
  name: string;
  description: string;
  baseTheme: BuiltInThemeId;
  basePreset: string;
  tokens: ThemeOverrides;
  components: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ThemeStudioSummary = Pick<
  ThemeStudioDocument,
  "id" | "name" | "description" | "baseTheme" | "basePreset" | "createdAt" | "updatedAt"
>;

type CreateThemeInput = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  baseTheme?: unknown;
  basePreset?: unknown;
  clonePreset?: unknown;
  tokens?: unknown;
  components?: unknown;
};

function studioDir(): string {
  return path.join(process.cwd(), ".staark", "themes");
}

function themeFile(id: string): string {
  return path.join(studioDir(), `${id}.json`);
}

export function slugifyThemeId(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isThemeId(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value);
}

function text(value: unknown, fallback = "", max = 160): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function builtInTheme(value: unknown): BuiltInThemeId | null {
  return typeof value === "string" && (BUILT_IN_THEME_IDS as readonly string[]).includes(value)
    ? (value as BuiltInThemeId)
    : null;
}

function mergeTokens(base: ThemeOverrides, custom: ThemeOverrides): ThemeOverrides {
  const out: ThemeOverrides = {};
  for (const group of ["colors", "typography", "radius", "layout"] as const) {
    const merged = { ...(base[group] ?? {}), ...(custom[group] ?? {}) };
    if (Object.keys(merged).length) out[group] = merged;
  }
  return out;
}

async function resolveBasePreset(baseTheme: BuiltInThemeId, requested: string): Promise<AdminThemePreset> {
  const presets = await readThemePresets(baseTheme);
  const preset = presets.find((item) => item.id === requested) ?? presets[0];
  if (!preset) {
    throw new Error(`Theme "${baseTheme}" has no readable presets.`);
  }
  return preset;
}

async function exists(id: string): Promise<boolean> {
  try {
    await access(themeFile(id));
    return true;
  } catch {
    return false;
  }
}

export async function listStudioThemes(): Promise<ThemeStudioSummary[]> {
  await mkdir(studioDir(), { recursive: true });
  const files = (await readdir(studioDir())).filter((file) => file.endsWith(".json")).sort();
  const themes: ThemeStudioSummary[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(studioDir(), file), "utf8"));
      const theme = parseStudioTheme(raw);
      themes.push({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        baseTheme: theme.baseTheme,
        basePreset: theme.basePreset,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      });
    } catch {
      // Ignore invalid local drafts instead of breaking the whole Theme Studio.
    }
  }

  return themes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readStudioTheme(id: string): Promise<ThemeStudioDocument> {
  if (!isThemeId(id)) throw new Error("Invalid theme id.");
  const raw = JSON.parse(await readFile(themeFile(id), "utf8"));
  return parseStudioTheme(raw);
}

export async function readStudioThemeWithBase(id: string): Promise<{
  theme: ThemeStudioDocument;
  basePreset: AdminThemePreset;
}> {
  const theme = await readStudioTheme(id);
  const basePreset = await resolveBasePreset(theme.baseTheme, theme.basePreset);
  return { theme, basePreset };
}

export async function createStudioTheme(input: CreateThemeInput): Promise<ThemeStudioDocument> {
  const name = text(input.name, "Untitled theme", 80);
  const id = slugifyThemeId(text(input.id, name, 64));
  if (!id || !isThemeId(id)) throw new Error("Use a valid theme name or id.");
  if (await exists(id)) throw new Error("A custom theme with this id already exists.");

  const baseTheme = builtInTheme(input.baseTheme) ?? "light";
  const requestedPreset = text(input.basePreset, "", 64);
  const preset = await resolveBasePreset(baseTheme, requestedPreset);
  const clonePreset = input.clonePreset !== false;
  const suppliedTokens = sanitizeOverrides(input.tokens);
  const suppliedComponents = sanitizeComponents(input.components);
  const now = new Date().toISOString();

  const theme: ThemeStudioDocument = {
    schema: THEME_STUDIO_SCHEMA,
    version: THEME_STUDIO_VERSION,
    id,
    name,
    description: text(input.description, "", 240),
    baseTheme,
    basePreset: preset.id,
    tokens: clonePreset ? mergeTokens(preset.tokens, suppliedTokens) : suppliedTokens,
    components: clonePreset
      ? { ...preset.components, ...suppliedComponents }
      : suppliedComponents,
    createdAt: now,
    updatedAt: now,
  };

  await writeStudioTheme(theme);
  return theme;
}

export async function updateStudioTheme(
  id: string,
  input: Partial<CreateThemeInput>,
): Promise<ThemeStudioDocument> {
  const current = await readStudioTheme(id);
  const baseTheme = builtInTheme(input.baseTheme) ?? current.baseTheme;
  const basePreset = text(input.basePreset, current.basePreset, 64);
  const preset = await resolveBasePreset(baseTheme, basePreset);

  const next: ThemeStudioDocument = {
    ...current,
    name: input.name === undefined ? current.name : text(input.name, current.name, 80),
    description:
      input.description === undefined
        ? current.description
        : text(input.description, "", 240),
    baseTheme,
    basePreset: preset.id,
    tokens:
      input.tokens === undefined ? current.tokens : sanitizeOverrides(input.tokens),
    components:
      input.components === undefined
        ? current.components
        : sanitizeComponents(input.components),
    updatedAt: new Date().toISOString(),
  };

  await writeStudioTheme(next);
  return next;
}

export async function writeStudioTheme(theme: ThemeStudioDocument): Promise<void> {
  await mkdir(studioDir(), { recursive: true });
  await writeFile(themeFile(theme.id), JSON.stringify(theme, null, 2) + "\n", "utf8");
}

export async function deleteStudioTheme(id: string): Promise<void> {
  if (!isThemeId(id)) throw new Error("Invalid theme id.");
  await unlink(themeFile(id));
}

export function parseStudioTheme(input: unknown): ThemeStudioDocument {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Theme document must be a JSON object.");
  }

  const raw = input as Record<string, unknown>;
  if (raw.schema !== THEME_STUDIO_SCHEMA || raw.version !== THEME_STUDIO_VERSION) {
    throw new Error(`Unsupported theme schema. Expected ${THEME_STUDIO_SCHEMA}.`);
  }

  const id = text(raw.id, "", 64);
  const baseTheme = builtInTheme(raw.baseTheme);
  const basePreset = text(raw.basePreset, "", 64);
  const createdAt = text(raw.createdAt, "", 64);
  const updatedAt = text(raw.updatedAt, "", 64);

  if (!isThemeId(id)) throw new Error("Invalid theme id.");
  if (!baseTheme) throw new Error("Invalid base theme.");
  if (!basePreset) throw new Error("Missing base preset.");
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) throw new Error("Invalid createdAt.");
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) throw new Error("Invalid updatedAt.");

  return {
    schema: THEME_STUDIO_SCHEMA,
    version: THEME_STUDIO_VERSION,
    id,
    name: text(raw.name, id, 80),
    description: text(raw.description, "", 240),
    baseTheme,
    basePreset,
    tokens: sanitizeOverrides(raw.tokens),
    components: sanitizeComponents(raw.components),
    createdAt,
    updatedAt,
  };
}


export async function importStudioTheme(
  input: unknown,
  onConflict: "copy" | "replace" | "reject" = "copy",
): Promise<ThemeStudioDocument> {
  const parsed = parseStudioTheme(input);
  await resolveBasePreset(parsed.baseTheme, parsed.basePreset);

  let id = parsed.id;
  const alreadyExists = await exists(id);

  if (alreadyExists && onConflict === "reject") {
    throw new Error("A custom theme with this id already exists.");
  }

  if (alreadyExists && onConflict === "copy") {
    const base = id.replace(/-\d+$/, "");
    let index = 2;
    while (await exists(`${base}-${index}`)) index += 1;
    id = `${base}-${index}`;
  }

  const now = new Date().toISOString();
  const imported: ThemeStudioDocument = {
    ...parsed,
    id,
    name: id === parsed.id ? parsed.name : `${parsed.name} Copy`,
    createdAt: alreadyExists && onConflict === "replace" ? parsed.createdAt : now,
    updatedAt: now,
  };

  await writeStudioTheme(imported);
  return imported;
}

export async function applyStudioTheme(id: string): Promise<{
  theme: ThemeStudioDocument;
  contentDir: string;
  activeBaseTheme: string;
  appliedPreset: string;
  crossFamily: boolean;
}> {
  const theme = await readStudioTheme(id);
  const root = contentRoot();
  const contentDir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  const activeBaseTheme = process.env.STAARK_THEME?.trim() || "salong";
  const activePresets = await readThemePresets(activeBaseTheme);

  if (!activePresets.length) {
    throw new Error(`Active theme family "${activeBaseTheme}" has no readable presets.`);
  }

  const site = await readSite(root);
  const previousTheme =
    site.theme && typeof site.theme === "object" && !Array.isArray(site.theme)
      ? (site.theme as Record<string, unknown>)
      : {};
  const previousPreset = typeof previousTheme.preset === "string" ? previousTheme.preset : "";
  const sameFamily = theme.baseTheme === activeBaseTheme;
  const appliedPreset =
    sameFamily && activePresets.some((item) => item.id === theme.basePreset)
      ? theme.basePreset
      : activePresets.some((item) => item.id === previousPreset)
        ? previousPreset
        : activePresets[0]!.id;

  // Theme Studio documents are design layers, not executable theme packages.
  // Applying one never swaps the deployment's React/theme family; it overlays
  // tokens and component variants on the currently installed family.
  site.theme = {
    ...previousTheme,
    preset: appliedPreset,
    overrides: theme.tokens,
    components: theme.components,
  };
  await writeSite(site, root);

  return {
    theme,
    contentDir,
    activeBaseTheme,
    appliedPreset,
    crossFamily: !sameFamily,
  };
}
