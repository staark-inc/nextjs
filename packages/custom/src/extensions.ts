import type { CustomAddon } from "./config.ts";
import type { LoadedCustomProject } from "./manifest.ts";
import type { CustomSectionOverrides } from "./composition.ts";

export type CustomExtensionContext = {
  project: LoadedCustomProject;
  config: CustomAddon["config"];
};

/** Trusted, bundled code only. JSON selects extensions; it never imports code. */
export type CustomExtensionDefinition = {
  key: string;
  kind: "module" | "addon";
  requires?: string[];
  sections?: CustomSectionOverrides;
  create?: (context: CustomExtensionContext) => unknown;
};

export function resolveCustomExtensions(
  project: LoadedCustomProject,
  definitions: readonly CustomExtensionDefinition[],
) {
  const registry = new Map<string, CustomExtensionDefinition>();
  for (const definition of definitions) {
    if (!definition.key.trim() || registry.has(definition.key)) {
      throw new Error(`Invalid or duplicate extension "${definition.key}".`);
    }
    registry.set(definition.key, definition);
  }
  const selected = new Map<string, CustomAddon>();
  for (const kind of ["module", "addon"] as const) {
    const entries = kind === "module" ? project.runtime.config.modules : project.runtime.config.addons;
    for (const entry of entries) {
      if (!entry.enabled) continue;
      if (selected.has(entry.key)) throw new Error(`Duplicate enabled extension "${entry.key}".`);
      const definition = registry.get(entry.key);
      if (!definition || definition.kind !== kind) throw new Error(`Unknown ${kind} "${entry.key}".`);
      selected.set(entry.key, entry);
    }
  }
  const ordered: CustomExtensionDefinition[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(key: string) {
    if (visited.has(key)) return;
    if (visiting.has(key)) throw new Error(`Extension dependency cycle at "${key}".`);
    if (!selected.has(key)) throw new Error(`Required extension "${key}" is not enabled.`);
    visiting.add(key);
    const definition = registry.get(key)!;
    for (const dependency of definition.requires ?? []) visit(dependency);
    visiting.delete(key);
    visited.add(key);
    ordered.push(definition);
  }
  for (const key of selected.keys()) visit(key);
  const sections: CustomSectionOverrides = {};
  const services = new Map<string, unknown>();
  for (const definition of ordered) {
    for (const [key, section] of Object.entries(definition.sections ?? {})) {
      if (Object.hasOwn(sections, key)) throw new Error(`Duplicate extension section "${key}".`);
      sections[key] = section;
    }
  }
  // Validate the entire graph and section set before constructing any services.
  for (const definition of ordered) {
    if (definition.create) services.set(definition.key, definition.create({ project, config: selected.get(definition.key)!.config }));
  }
  return { definitions: ordered, sections, services };
}
