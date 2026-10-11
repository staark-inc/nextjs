import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { PageSchema, SiteSettingsSchema } from "@staark/core";
import type { LoadedCustomProject } from "@staark/custom";
import type { ThemeDefinition } from "@staark/theme-kit";
import { resolveActiveCustomProjectDirectory } from "./custom-project.ts";

async function readProjectContent(project: LoadedCustomProject, file: "site.json" | "home.json" | `pages/${string}.json`, directory: string) {
  const root = await realpath(directory);
  let text: string;
  try {
    const actual = await realpath(path.join(root, "content", file));
    const relative = path.relative(root, actual);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Custom content must remain within the project.");
    text = await readFile(actual, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== "object" || Array.isArray(data) || (data as { projectKey?: unknown }).projectKey !== project.project.key) {
    throw new Error("Custom content belongs to a different project.");
  }
  return data as Record<string, unknown>;
}

export async function loadCustomSite(project: LoadedCustomProject, directory = resolveActiveCustomProjectDirectory()) {
  const input = await readProjectContent(project, "site.json", directory);
  return SiteSettingsSchema.parse({
    name: project.project.name, websiteType: "custom", locale: "sv-SE", url: "http://localhost:3300",
    ...input,
    // Deployment manifest owns family/preset; site content owns token overrides.
    theme: { ...(input?.theme as Record<string, unknown> | undefined), family: project.runtime.config.theme.family, preset: project.runtime.config.theme.variant },
  });
}

export async function loadCustomHome(project: LoadedCustomProject, directory = resolveActiveCustomProjectDirectory()) {
  const input = await readProjectContent(project, "home.json", directory);
  const page = PageSchema.parse(input ?? {
    path: "/", title: project.project.name, blocks: [{ id: "hero", type: "hero", props: { heading: project.project.name, intro: "" } }],
  });
  if (page.path !== "/") throw new Error("Custom home content must use the root path.");
  return page;
}

export function customPagePath(segments: readonly string[]): string | null {
  if (!segments.length || segments.some(segment => !/^[a-z0-9][a-z0-9-]*$/.test(segment))) return null;
  if (["api", "admin", "dashboard", "_next"].includes(segments[0]!)) return null;
  return `/${segments.join("/")}`;
}

/** No fallback to another project or demo page for missing URLs. */
export async function loadCustomPage(project: LoadedCustomProject, segments: readonly string[], directory = resolveActiveCustomProjectDirectory()) {
  const requestedPath = customPagePath(segments);
  if (!requestedPath) return null;
  const input = await readProjectContent(project, `pages/${segments.join("/")}.json`, directory);
  if (!input) return null;
  if (input.status !== undefined && input.status !== "published" && input.status !== "draft") throw new Error("Invalid Custom page publication status.");
  if (input.status === "draft") return null;
  const page = PageSchema.parse(input);
  if (page.path !== requestedPath) throw new Error("Custom page path does not match its content location.");
  return page;
}

export function validateCustomPageBlocks(page: { blocks: { id: string; type: string }[] }, theme: ThemeDefinition, registry: Record<string, ThemeDefinition>) {
  const available = new Set<string>();
  const visited = new Set<string>();
  let current: ThemeDefinition | undefined = theme;
  while (current) {
    if (visited.has(current.id)) throw new Error("Theme parent cycle.");
    visited.add(current.id);
    Object.keys(current.sections).forEach(key => available.add(key));
    current = current.parentId ? registry[current.parentId] : undefined;
  }
  const ids = new Set<string>();
  for (const block of page.blocks) {
    if (ids.has(block.id)) throw new Error(`Duplicate block id "${block.id}".`);
    if (!available.has(block.type)) throw new Error(`Unknown project block "${block.type}".`);
    ids.add(block.id);
  }
}
