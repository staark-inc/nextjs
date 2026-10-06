import { composeCustomTheme, type LoadedCustomProject, type CustomSectionOverrides } from "@staark/custom";
import { customSectionOverrides } from "@/project/overrides";
import { getThemeRuntime } from "./theme-catalog";

export function resolveCustomTheme(project: LoadedCustomProject, sections: CustomSectionOverrides = {}) {
  const { family, variant } = project.runtime.config.theme;
  const selected = getThemeRuntime(family);
  if (!selected) throw new Error(`Unsupported Custom theme family "${family}".`);
  if (variant && !selected.theme.presets[variant]) throw new Error(`Unknown preset "${variant}" for "${family}".`);
  const theme = composeCustomTheme({
    runtime: project.runtime,
    baseTheme: { ...selected.theme, defaultPreset: variant ?? selected.theme.defaultPreset },
    sections: customSectionOverrides,
  });
  if (project.runtime.capabilities.includes("theme-extensions")) {
    theme.sections = { ...selected.theme.sections, ...sections, ...(
      project.runtime.capabilities.includes("components") ? customSectionOverrides : {}
    ) };
  }
  return { theme, registry: { ...selected.registry, [theme.id]: theme } };
}
