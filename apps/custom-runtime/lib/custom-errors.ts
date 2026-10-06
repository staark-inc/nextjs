import type { ComponentType, CSSProperties } from "react";
import type { LoadedCustomProject } from "@staark/custom";

/** Public presentation only; never serialize the runtime/manifest into a boundary. */
export type CustomErrorPresentation = {
  project: { key: string; name: string };
  allowOverrides: boolean;
  style: CSSProperties;
};
export type CustomNotFoundProps = { project: CustomErrorPresentation["project"] };
export type CustomErrorProps = CustomNotFoundProps & { reset: () => void; reference?: string };
export type CustomErrorPages = {
  notFound?: ComponentType<CustomNotFoundProps>;
  error?: ComponentType<CustomErrorProps>;
};
export type CustomErrorRegistry = Record<string, CustomErrorPages>;
export function createErrorPresentation(project: LoadedCustomProject, name: string, style: CSSProperties = {}): CustomErrorPresentation {
  return { project: { key: project.project.key, name }, allowOverrides: project.runtime.capabilities.includes("errors"), style };
}
export function resolveCustomErrorPages(presentation: CustomErrorPresentation | null, registry: CustomErrorRegistry): CustomErrorPages {
  if (!presentation?.allowOverrides) return {};
  return Object.hasOwn(registry, presentation.project.key) ? registry[presentation.project.key]! : {};
}
export function errorReference(digest: string | undefined) {
  // Render only short framework references, never error messages or stack traces.
  return digest && /^[a-zA-Z0-9_-]{1,80}$/.test(digest) ? digest : undefined;
}
