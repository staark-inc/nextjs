import "server-only";
import { createBlogAddon } from "@staark/addon-blog";
import { resolveCustomExtensions, type LoadedCustomProject } from "@staark/custom";
import { createCustomApiIntegrations } from "@staark/custom/integrations";
import { customExtensions } from "@/project/extensions";
import { resolveActiveCustomProjectDirectory } from "@/lib/custom-project";

/** Construct per-project services without global project state. */
export function resolveCustomServices(project: LoadedCustomProject) {
  const directory = resolveActiveCustomProjectDirectory();
  return {
    extensions: resolveCustomExtensions(project, [...customExtensions, createBlogAddon(directory)]),
    integrations: createCustomApiIntegrations(project.runtime.config),
  };
}
