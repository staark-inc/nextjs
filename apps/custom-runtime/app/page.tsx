import type { Metadata } from "next";
import { BlockRenderer } from "@staark/theme-kit";
import { loadActiveCustomProject } from "@/lib/custom-project";
import { resolveCustomServices } from "@/lib/custom-services";
import { resolveCustomTheme } from "@/lib/custom-theme";
import { loadCustomSite, loadCustomHome, validateCustomPageBlocks } from "@/lib/custom-content";
import { CustomProjectFrame } from "@/lib/custom-frame";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const project = await loadActiveCustomProject();
  const site = await loadCustomSite(project);
  return { title: site.name, description: site.seo.defaultDescription };
}
export default async function Page() {
  const project = await loadActiveCustomProject();
  const services = resolveCustomServices(project);
  const { theme, registry } = resolveCustomTheme(project, services.extensions.sections);
  const [site, page] = await Promise.all([loadCustomSite(project), loadCustomHome(project)]);
  validateCustomPageBlocks(page, theme, registry);
  return <CustomProjectFrame project={project} site={site}><main>
    <BlockRenderer blocks={page.blocks} site={site} theme={theme} registry={registry} />
  </main></CustomProjectFrame>;
}
