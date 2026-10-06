import "server-only";
import { resolveCustomExtensions, type LoadedCustomProject } from "@staark/custom";
import { createCustomApiIntegrations } from "@staark/custom/integrations";
import { customExtensions } from "@/project/extensions";

/** Construct per-project services without global project state. */
export function resolveCustomServices(project: LoadedCustomProject) {
  return {
    extensions: resolveCustomExtensions(project, customExtensions),
    integrations: createCustomApiIntegrations(project.runtime.config),
  };
}
