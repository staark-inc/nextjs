import type {
  ComponentType,
  ReactNode,
} from "react";

import type {
  LoadedCustomProject,
} from "@staark/custom";

export type CustomLayoutProjectProps = {
  project:
    LoadedCustomProject;
};

export type CustomPageShellProps =
  CustomLayoutProjectProps & {
    children:
      ReactNode;
  };

export type CustomProjectLayouts = {
  header?:
    ComponentType<CustomLayoutProjectProps>;

  footer?:
    ComponentType<CustomLayoutProjectProps>;

  page?:
    ComponentType<CustomPageShellProps>;
};

export function resolveCustomLayouts(
  project:
    LoadedCustomProject,

  layouts:
    CustomProjectLayouts,
): CustomProjectLayouts {
  const allowed =
    project.runtime
      .capabilities
      .includes(
        "layouts",
      );

  if (
    !allowed
  ) {
    return {};
  }

  return layouts;
}
