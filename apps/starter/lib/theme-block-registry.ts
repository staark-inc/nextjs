import type { BlockDefinition } from "@staark/theme-kit";
import { skonhetBlockDefinitions } from "@staark/theme-skonhet/blocks";
import { elBlockDefinitions } from "@staark/theme-el/blocks";
import { kreatorBlockDefinitions } from "@staark/theme-kreator/blocks";

/**
 * Blocks v2 integration point for the starter application.
 *
 * Theme packages own their block definitions. The starter only registers the
 * exported definition arrays here, then all consumers resolve them through the
 * generic helpers below. Adding the next migrated theme should be one import
 * and one registry entry rather than changes in every Admin subsystem.
 */
const THEME_BLOCK_DEFINITIONS: Record<
  string,
  readonly BlockDefinition[]
> = {
  skonhet: skonhetBlockDefinitions,
  el: elBlockDefinitions,
  kreator: kreatorBlockDefinitions,
};

export function themeBlockDefinitionsFor(
  themeId: string,
): readonly BlockDefinition[] {
  return THEME_BLOCK_DEFINITIONS[themeId] ?? [];
}

export function themeBlockDefinitionFor(
  themeId: string,
  blockType: string,
): BlockDefinition | undefined {
  return themeBlockDefinitionsFor(themeId).find(
    (definition) => definition.type === blockType,
  );
}

