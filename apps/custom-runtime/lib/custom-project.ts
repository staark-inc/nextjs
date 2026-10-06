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

  return loadCustomProjectFromDirectory(
    source.location,
  );
}
