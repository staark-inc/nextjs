import path from "node:path";

import type {
  LoadedCustomProject,
} from "@staark/custom";

import {
  loadCustomProjectFromDirectory,
  loadCustomProjectFromFile,
} from "@staark/custom/source";

export function resolveCustomProjectSource(
  env:
    NodeJS.ProcessEnv =
      process.env,
): {
  type:
    "file" |
    "directory";

  location:
    string;
} {
  const manifestPath =
    env
      .STAARK_CUSTOM_MANIFEST_PATH
      ?.trim();

  if (
    manifestPath
  ) {
    return {
      type:
        "file",

      location:
        path.resolve(
          manifestPath,
        ),
    };
  }

  const projectDirectory =
    env
      .STAARK_CUSTOM_PROJECT_DIR
      ?.trim();

  if (
    projectDirectory
  ) {
    return {
      type:
        "directory",

      location:
        path.resolve(
          projectDirectory,
        ),
    };
  }

  const root = env.STAARK_CUSTOM_PROJECTS_ROOT?.trim();
  const key = env.STAARK_CUSTOM_PROJECT_KEY?.trim();
  if (root || key) {
    if (!root || !key || !/^[a-z0-9][a-z0-9-]*$/.test(key)) {
      throw new Error("Shared project selection requires PROJECTS_ROOT and a valid PROJECT_KEY.");
    }
    return { type: "directory", location: path.resolve(root, key) };
  }

  return {
    type:
      "directory",

    location:
      path.resolve(
        process.cwd(),
        "project",
      ),
  };
}

export function resolveActiveCustomProjectDirectory(): string {
  const source = resolveCustomProjectSource();
  return source.type === "file" ? path.dirname(source.location) : source.location;
}

export async function loadActiveCustomProject():
Promise<LoadedCustomProject> {
  const source =
    resolveCustomProjectSource();

  if (
    source.type ===
    "file"
  ) {
    return loadCustomProjectFromFile(
      source.location,
    );
  }

  const project = await loadCustomProjectFromDirectory(source.location);
  const selectedKey = process.env.STAARK_CUSTOM_PROJECT_KEY?.trim();
  if (process.env.STAARK_CUSTOM_PROJECTS_ROOT && !process.env.STAARK_CUSTOM_PROJECT_DIR && selectedKey && project.project.key !== selectedKey) {
    throw new Error("Selected project key does not match its manifest.");
  }
  return project;
}
