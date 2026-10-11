import type { LoadedCustomProject } from "@staark/custom";
import { BlogConfigSchema, matchBlogPath } from "@staark/addon-blog/config";

/** Configured addon namespaces stay reserved when disabled. */
export function resolveCustomBlogPath(project: LoadedCustomProject, segments: readonly string[]) {
  const addon = project.runtime.config.addons.find(item => item.key === "blog");
  if (!addon) return { owns: false, slug: null };
  const base = BlogConfigSchema.parse(addon.config).basePath;
  const prefix = base.slice(1).split("/");
  const owns = prefix.every((part, index) => segments[index] === part);
  return { owns, slug: owns ? matchBlogPath(base, segments) : null };
}
