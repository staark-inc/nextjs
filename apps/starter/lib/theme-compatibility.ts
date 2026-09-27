import { contentStoragePath, listContent, readContentJson } from "./storage";
import { getThemeRuntime } from "./theme-runtime";

export type ThemeBlockUsage = {
  type: string;
  count: number;
  pages: string[];
};

export type ThemeCompatibility = {
  compatible: boolean;
  incompatible: ThemeBlockUsage[];
};

type ContentPage = {
  blocks?: unknown[];
};

export function themeSupportedBlockTypes(themeId: string): Set<string> {
  const runtime = getThemeRuntime(themeId);
  if (!runtime) throw new Error(`Unknown theme family "${themeId}".`);

  const supported = new Set<string>();
  for (const definition of [runtime.theme, ...Object.values(runtime.registry ?? {})]) {
    for (const type of Object.keys(definition.sections)) supported.add(type);
  }
  return supported;
}

export async function scanThemeBlockUsage(): Promise<ThemeBlockUsage[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  const files = (await listContent("pages"))
    .map((entry) => entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "")
    .filter((file) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort();

  const usage = new Map<string, { count: number; pages: Set<string> }>();

  for (const file of files) {
    const page = await readContentJson<ContentPage>(`pages/${file}`);
    if (!page || !Array.isArray(page.blocks)) continue;

    for (const block of page.blocks) {
      if (!block || typeof block !== "object" || Array.isArray(block)) continue;
      const rawType = (block as Record<string, unknown>).type;
      if (typeof rawType !== "string" || !rawType.trim()) continue;

      const type = rawType.trim();
      const current = usage.get(type) ?? { count: 0, pages: new Set<string>() };
      current.count += 1;
      current.pages.add(file);
      usage.set(type, current);
    }
  }

  return [...usage.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      pages: [...value.pages].sort(),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function evaluateThemeCompatibility(
  themeId: string,
  usage: ThemeBlockUsage[],
): ThemeCompatibility {
  const supported = themeSupportedBlockTypes(themeId);
  const incompatible = usage.filter((item) => !supported.has(item.type));
  return {
    compatible: incompatible.length === 0,
    incompatible,
  };
}
