import type {
  LoadedCustomProject,
} from "@staark/custom";

export type CustomProjectStyles = {
  css: string;
};

export function resolveCustomStyles(
  project: LoadedCustomProject,
  styles: CustomProjectStyles,
): CustomProjectStyles | null {
  const allowed =
    project.runtime.capabilities.includes("styles");

  if (!allowed) {
    return null;
  }

  return styles;
}
