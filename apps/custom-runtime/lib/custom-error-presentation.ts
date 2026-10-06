import "server-only";
import { presetToCssVars, resolvePreset } from "@staark/theme-kit";
import { loadActiveCustomProject } from "./custom-project";
import { loadCustomSite } from "./custom-content";
import { resolveCustomTheme } from "./custom-theme";
import { createErrorPresentation } from "./custom-errors";

/** Recovery must not depend on addon/API/SMTP availability. */
export async function loadCustomErrorPresentation() {
  try {
    const project = await loadActiveCustomProject();
    let name = project.project.name;
    let style = {};
    try {
      const site = await loadCustomSite(project);
      name = site.name;
      const { theme } = resolveCustomTheme(project);
      style = presetToCssVars(resolvePreset(theme), site.theme.overrides);
    } catch { /* Broken content/theme still permits project-owned recovery. */ }
    return createErrorPresentation(project, name, style);
  } catch { return null; }
}
