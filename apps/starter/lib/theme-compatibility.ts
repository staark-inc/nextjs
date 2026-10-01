import { listAdminContentPages } from "./admin-site-settings";
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
  const pages = await listAdminContentPages();
  const usage = new Map<string, { count: number; pages: Set<string> }>();

  for (const { file, page } of pages) {
    for (const block of page.blocks) {
      const type = block.type.trim();
      if (!type) continue;

      const current = usage.get(type) ?? { count: 0, pages: new Set<string>() };
      current.count += 1;
      current.pages.add(page.path || file);
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
