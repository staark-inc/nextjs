import "server-only";
import path from "node:path";
import { createBlogAddon } from "@staark/addon-blog";
import { resolveCustomExtensions, type LoadedCustomProject } from "@staark/custom";
import { createCustomApiIntegrations } from "@staark/custom/integrations";
import { customExtensions } from "@/project/extensions";
import { resolveCustomProjectSource } from "@/lib/custom-project";

/** Construct per-project services without global project state. */
export function resolveCustomServices(project: LoadedCustomProject) {
  const source = resolveCustomProjectSource();
  const directory = source.type === "file" ? path.dirname(source.location) : source.location;
  return {
    extensions: resolveCustomExtensions(project, [...customExtensions, createBlogAddon(directory)]),
    integrations: createCustomApiIntegrations(project.runtime.config),
  };
}
