import { redirect } from "next/navigation";
import { BlockRenderer } from "@staark/theme-kit";
import { CustomProjectFrame } from "@/lib/custom-frame";
import { editorContext } from "@/lib/editor-request";
import { getEditorPage } from "@/lib/editor-store";
import { resolveCustomTheme } from "@/lib/custom-theme";
import { resolveCustomServices } from "@/lib/custom-services";
import { validateCustomPageBlocks } from "@/lib/custom-content";
export default async function Preview({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const context = await editorContext();
  if (!context.session) redirect("/admin");
  const { page } = await getEditorPage(context.directory, context.project, (await searchParams).path ?? "/");
  const services = resolveCustomServices(context.project);
  const { theme, registry } = resolveCustomTheme(context.project, services.extensions.sections);
  validateCustomPageBlocks(page, theme, registry);
  return <><div className="ce-preview-bar"><strong>Preview · {page.status} · {page.path}</strong><a href="/admin">Back to workspace</a><span>Saved version. Navigation opens the public site.</span></div>
    <CustomProjectFrame project={context.project} site={context.site}><main><BlockRenderer blocks={page.blocks} site={context.site} theme={theme} registry={registry} /></main></CustomProjectFrame></>;
}
