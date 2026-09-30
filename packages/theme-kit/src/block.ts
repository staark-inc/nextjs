/**
 * Blocks v2 — shared, serializable block definition contract.
 *
 * This module deliberately contains no React or Next.js types. Themes can use
 * the same definition for Admin metadata, validation hints and block-picker
 * defaults without coupling the theme package to the starter application.
 *
 * Rendering remains owned by ThemeDefinition.sections. Keeping the definition
 * serializable lets the starter expose it through /api/admin/blocks safely.
 */

export type BlockFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "imageUrl"
  | "icon"
  | "link"
  | "array"
  | "object";

export type BlockFieldOption =
  | string
  | number
  | {
      label: string;
      value: string | number;
    };

export type BlockFieldFormat = "sek" | "sek-from";

/**
 * Admin editor descriptor for one property in a block's props object.
 * Nested object/array editors use the same descriptor recursively.
 */
export type BlockField = {
  name: string;
  label: string;
  type: BlockFieldType;
  help?: string;
  placeholder?: string;
  options?: readonly BlockFieldOption[];
  min?: number;
  max?: number;
  format?: BlockFieldFormat;
  /** Array item heading. "{field}" is replaced with that item's field value. */
  itemLabel?: string;
  /** Array item fields or nested object fields. */
  fields?: readonly BlockField[];
};

export type BlockPreset<
  Props extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  label: string;
  description?: string;
  props: Partial<Props>;
};

/**
 * Generic editing capabilities understood by Admin.
 *
 * These describe controls around the block rather than business-specific props.
 * A theme may ignore a capability it does not visually implement.
 */
export type BlockCapabilities = {
  background?: boolean;
  spacing?: boolean;
  alignment?: boolean;
  width?: boolean;
  anchor?: boolean;
  visibility?: boolean;
};

export type BlockDefinition<
  Props extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Stable block id used by page JSON and ThemeDefinition.sections. */
  type: string;
  /** Human-readable picker label. */
  label: string;
  description?: string;
  icon?: string;
  category?: string;
  /** Definition schema version, independent from theme/package versions. */
  version?: number;

  fields: readonly BlockField[];
  /** Minimum top-level props required for a useful/renderable block. */
  required?: readonly string[];

  /** Props inserted when the user adds the block from the picker. */
  defaults: Props;
  /** Optional alternative starting points using the same block renderer. */
  presets?: readonly BlockPreset<Props>[];
  capabilities?: BlockCapabilities;
};

/**
 * Identity helper that keeps literal inference while validating a Blocks v2
 * definition at compile time.
 */
export function defineBlock<const Definition extends BlockDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

/**
 * Legacy block-picker shape used by the starter API during the v1 → v2
 * migration. This adapter lets definitions move one-by-one without a big-bang
 * rewrite of the Admin editor.
 */
export type LegacyBlockTemplate = {
  type: string;
  label: string;
  description: string;
  icon: string;
  template: Record<string, unknown>;
};

export function blockDefinitionToLegacyTemplate(
  definition: BlockDefinition,
): LegacyBlockTemplate {
  return {
    type: definition.type,
    label: definition.label,
    description: definition.description ?? "",
    icon: definition.icon ?? "layout",
    template: { ...definition.defaults },
  };
}
