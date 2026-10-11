import type { CustomExtensionDefinition } from "@staark/custom";

// Explicit imports of trusted code. Never import module paths from JSON.
export const customExtensions: CustomExtensionDefinition[] = [
  {
    key: "project-info",
    kind: "module",
    create: ({ project }) => ({ key: project.project.key, name: project.project.name }),
  },
  {
    key: "project-label",
    kind: "addon",
    requires: ["project-info"],
    create: ({ project, config }) => ({ label: config.label ?? project.project.name }),
  },
];
