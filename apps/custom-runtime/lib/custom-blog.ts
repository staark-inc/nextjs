import "server-only";
import type { BlogService } from "@staark/addon-blog";
import { loadActiveCustomProject } from "./custom-project";
import { resolveCustomServices } from "./custom-services";

export async function loadCustomBlog() {
  const project = await loadActiveCustomProject();
  const services = resolveCustomServices(project);
  const blog = services.extensions.services.get("blog") as BlogService | undefined;
  return { project, blog };
}
