import type { Block, SiteSettings } from "@staark/core";
import type { SectionContext, ThemeDefinition, ThemeImageComponent } from "./theme";
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
  /** Host image renderer (Next.js injects next/image; other hosts may omit it). */
  image?: ThemeImageComponent;
};

type SectionAppearance = {
  background: "default" | "surface" | "accent" | "dark" | "gradient";
  classNames: string[];
};

const APPEARANCE_BACKGROUNDS = new Set<SectionAppearance["background"]>([
  "default",
  "surface",
  "accent",
  "dark",
  "gradient",
]);

function readSectionAppearance(props: Record<string, unknown>): SectionAppearance | null {
  const raw = props._appearance;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const appearance = raw as Record<string, unknown>;
  const requestedBackground =
    typeof appearance.background === "string" ? appearance.background : "default";
  const background = APPEARANCE_BACKGROUNDS.has(
    requestedBackground as SectionAppearance["background"],
  )
    ? (requestedBackground as SectionAppearance["background"])
    : "default";

  const classNames =
    typeof appearance.className === "string"
      ? appearance.className
          .split(/\s+/)
          .map((name) => name.trim())
          .filter((name) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name))
          .slice(0, 4)
      : [];

  if (background === "default" && classNames.length === 0) return null;
  return { background, classNames };
}

export function BlockRenderer({ blocks, site, theme, registry, image }: BlockRendererProps) {
  const chain = resolveThemes(theme, registry);
  const preset = resolvePreset(theme, site.theme.preset);
  const components = { ...preset.components, ...site.theme.components };

  return blocks.map((block, blockIndex) => {
    const ctx: SectionContext = {
      site,
      components,
      image,
      blockIndex,
    };
    const owner = chain.find((t) => t.sections[block.type]);
    const Section = owner?.sections[block.type];
    if (!Section) {
      // Read NODE_ENV via globalThis so this shared package typechecks in every
      // consumer, including theme packages whose tsconfig has no Node types.
      const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
      if (nodeEnv !== "production") {
        return (
          <div key={block.id} data-staark-unknown={block.type} style={{ padding: 16, border: "1px dashed #c00", color: "#c00", font: "13px monospace" }}>
            Unknown section: {block.type}
          </div>
        );
      }
      return null;
    }
    const appearance = readSectionAppearance(block.props);
    if (!appearance) {
      return <Section key={block.id} props={block.props} ctx={ctx} />;
    }

    const appearanceClasses = [
      "sk-block-appearance",
      appearance.background !== "default"
        ? `sk-block-appearance--${appearance.background}`
        : "",
      ...appearance.classNames,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        key={block.id}
        className={appearanceClasses}
        data-staark-appearance={
          appearance.background !== "default" ? appearance.background : undefined
        }
      >
        <Section props={block.props} ctx={ctx} />
      </div>
    );
  });
}
