import type { Block, SiteSettings } from "@staark/core";
import type { SectionContext, ThemeDefinition } from "./theme";
import { resolvePreset } from "./theme";

/**
 * Renderer: for each Hub block, look up the section in the active theme (falling
 * back to the parent theme) and render it. An unknown block type renders nothing
 * in production and a visible marker in development, so a Hub typo never crashes
 * the page.
 */

function resolveThemes(theme: ThemeDefinition, registry?: Record<string, ThemeDefinition>): ThemeDefinition[] {
  const chain: ThemeDefinition[] = [theme];
  let current = theme;
  while (current.parentId && registry?.[current.parentId]) {
    current = registry[current.parentId]!;
    chain.push(current);
  }
  return chain;
}

export type BlockRendererProps = {
  blocks: Block[];
  site: SiteSettings;
  theme: ThemeDefinition;
  /** Optional map of id → ThemeDefinition so child themes can resolve parent sections. */
  registry?: Record<string, ThemeDefinition>;
};

export function BlockRenderer({ blocks, site, theme, registry }: BlockRendererProps) {
  const chain = resolveThemes(theme, registry);
  const preset = resolvePreset(theme, site.theme.preset);
  const ctx: SectionContext = {
    site,
    components: { ...preset.components, ...site.theme.components },
  };

  return blocks.map((block) => {
    const owner = chain.find((t) => t.sections[block.type]);
    const Section = owner?.sections[block.type];
    if (!Section) {
      if (process.env.NODE_ENV !== "production") {
        return (
          <div key={block.id} data-staark-unknown={block.type} style={{ padding: 16, border: "1px dashed #c00", color: "#c00", font: "13px monospace" }}>
            Unknown section: {block.type}
          </div>
        );
      }
      return null;
    }
    return <Section key={block.id} props={block.props} ctx={ctx} />;
  });
}
