import lightTheme from "@staark/theme-light";

import {
  composeCustomTheme,
  type LoadedCustomProject,
} from "@staark/custom";

import {
  customSectionOverrides,
} from "@/project/overrides";

export function resolveCustomTheme(
  project:
    LoadedCustomProject,
) {
  const family =
    project.runtime
      .config.theme.family;

  if (
    family !==
    "light"
  ) {
    throw new Error(
      `Unsupported Custom theme family "${family}".`,
    );
  }

  return composeCustomTheme({
    runtime:
      project.runtime,

    baseTheme:
      lightTheme,

    sections:
      customSectionOverrides,
  });
}
