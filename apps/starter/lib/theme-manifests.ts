import type { ThemeManifest } from "@staark/theme-kit";
import lightManifest from "@staark/theme-light/manifest";
import salongManifest from "@staark/theme-salong/manifest";
import gastfrihetManifest from "@staark/theme-gastfrihet/manifest";
import byraManifest from "@staark/theme-byra/manifest";
import webbManifest from "@staark/theme-webb/manifest";
import skonhetManifest from "@staark/theme-skonhet/manifest";
import elManifest from "@staark/theme-el/manifest";
import kreatorManifest from "@staark/theme-kreator/manifest";
import verkstadManifest from "@staark/theme-verkstad/manifest";

const MANIFESTS: Record<string, ThemeManifest> = {
  light: lightManifest,
  salong: salongManifest,
  gastfrihet: gastfrihetManifest,
  byra: byraManifest,
  webb: webbManifest,
  skonhet: skonhetManifest,
  el: elManifest,
  kreator: kreatorManifest,
  verkstad: verkstadManifest,
};

export function resolveThemeManifest(themeId: string): ThemeManifest {
  return MANIFESTS[themeId] ?? MANIFESTS.light!;
}

/** Blocks owned only by this theme, excluding inherited Light blocks. */
export function themeOwnedBlockIds(themeId: string): ReadonlySet<string> {
  return new Set(resolveThemeManifest(themeId).blocks);
}

/**
 * Blocks available to an active theme = its own blocks + parent blocks.
 * Sibling-theme blocks are never included.
 */
export function availableBlockIdsForTheme(themeId: string): ReadonlySet<string> {
  const ids = new Set<string>();
  const visited = new Set<string>();

  let current: ThemeManifest | undefined = resolveThemeManifest(themeId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);

    for (const block of current.blocks) {
      ids.add(block);
    }

    current = current.parentId
      ? MANIFESTS[current.parentId]
      : undefined;
  }

  return ids;
}

export function isBlockAvailableForTheme(
  themeId: string,
  blockType: string,
): boolean {
  return availableBlockIdsForTheme(themeId).has(blockType);
}

export function assertBlocksAvailableForTheme<
  T extends { type?: unknown },
>(
  themeId: string,
  blocks: readonly T[],
): T[] {
  const allowed = availableBlockIdsForTheme(themeId);

  const invalid = blocks
    .map((block) => typeof block.type === "string" ? block.type : "")
    .filter((type) => type && !allowed.has(type));

  if (invalid.length) {
    throw new Error(
      `Theme "${themeId}" cannot use block(s): ${[...new Set(invalid)].join(", ")}`,
    );
  }

  return [...blocks];
}
