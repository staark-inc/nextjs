import { NextResponse } from "next/server";
import { customBaseBlockDefinitions, customBaseShortcuts } from "@staark/theme-custom-base/blocks";
import { loadActiveCustomProject } from "@/lib/custom-project";
import { resolveCustomTheme } from "@/lib/custom-theme";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const project = await loadActiveCustomProject();
    const { registry } = resolveCustomTheme(project);
    const available = project.runtime.config.theme.family === "custom-base" || Object.values(registry).some(theme => theme.id === "custom-base");
    return NextResponse.json({ theme: project.runtime.config.theme.family, blocks: available ? customBaseBlockDefinitions : [], shortcuts: available ? customBaseShortcuts : {} }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Block catalog unavailable" }, { status: 503 });
  }
}
