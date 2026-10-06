import type {
  SectionComponent,
  ThemeDefinition,
} from "@staark/theme-kit";

import type {
  LoadedCustomRuntime,
} from "./loader.ts";

export type CustomSectionOverrides =
  Record<
    string,
    SectionComponent<any>
  >;

export type ComposeCustomThemeInput = {
  runtime:
    LoadedCustomRuntime;

  baseTheme:
    ThemeDefinition;

  sections?:
    CustomSectionOverrides;
};

export function composeCustomTheme(
  input:
    ComposeCustomThemeInput,
): ThemeDefinition {
  const {
    runtime,
    baseTheme,
  } =
    input;

  const allowComponents =
    runtime.capabilities.includes(
      "components",
    );

  const customSections =
    allowComponents
      ? input.sections ?? {}
      : {};

  return {
    ...baseTheme,

    id:
      `custom:${runtime.config.theme.family}`,

    name:
      `${baseTheme.name} · Custom`,

    sections: {
      ...baseTheme.sections,
      ...customSections,
    },
  };
}
