import {
  readFile,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import {
  loadCustomProject,
  type LoadedCustomProject,
} from "./manifest.ts";

export const CUSTOM_PROJECT_MANIFEST_FILE =
  "staark.custom.json" as const;

export type CustomProjectTextSource = {
  read(
    location: string,
  ): Promise<string>;
};

export type CustomProjectSourceErrorCode =
  | "NOT_FOUND"
  | "READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_MANIFEST";

export class CustomProjectSourceError
  extends Error {
  readonly code:
    CustomProjectSourceErrorCode;

  readonly location:
    string;

  constructor(
    code:
      CustomProjectSourceErrorCode,

    location:
      string,

    message:
      string,

    options?: {
      cause?: unknown;
    },
  ) {
    super(
      message,
      options,
    );

    this.name =
      "CustomProjectSourceError";

    this.code =
      code;

    this.location =
      location;
  }
}

export function resolveCustomProjectManifestPath(
  projectDirectory:
    string,
): string {
  return resolve(
    projectDirectory,
    CUSTOM_PROJECT_MANIFEST_FILE,
  );
}

export function createFileSystemCustomProjectSource():
CustomProjectTextSource {
  return {
    async read(
      location:
        string,
    ): Promise<string> {
      try {
        return await readFile(
          location,
          "utf8",
        );
      } catch (error) {
        const code =
          (
            error as {
              code?: unknown;
            }
          )?.code;

        if (
          code ===
          "ENOENT"
        ) {
          throw new CustomProjectSourceError(
            "NOT_FOUND",
            location,
            `Custom project manifest was not found at "${location}".`,
            {
              cause:
                error,
            },
          );
        }

        throw new CustomProjectSourceError(
          "READ_FAILED",
          location,
          `Could not read custom project manifest at "${location}".`,
          {
            cause:
              error,
          },
        );
      }
    },
  };
}

export async function loadCustomProjectFromSource(
  source:
    CustomProjectTextSource,

  location:
    string,
): Promise<LoadedCustomProject> {
  let raw:
    string;

  try {
    raw =
      await source.read(
        location,
      );
  } catch (error) {
    if (
      error instanceof
      CustomProjectSourceError
    ) {
      throw error;
    }

    throw new CustomProjectSourceError(
      "READ_FAILED",
      location,
      `Could not read custom project manifest at "${location}".`,
      {
        cause:
          error,
      },
    );
  }

  let input:
    unknown;

  try {
    input =
      JSON.parse(
        raw,
      );
  } catch (error) {
    throw new CustomProjectSourceError(
      "INVALID_JSON",
      location,
      `Custom project manifest at "${location}" is not valid JSON.`,
      {
        cause:
          error,
      },
    );
  }

  try {
    return loadCustomProject(
      input,
    );
  } catch (error) {
    throw new CustomProjectSourceError(
      "INVALID_MANIFEST",
      location,
      `Custom project manifest at "${location}" does not match the Staark Custom schema.`,
      {
        cause:
          error,
      },
    );
  }
}

export async function loadCustomProjectFromFile(
  manifestPath:
    string,
): Promise<LoadedCustomProject> {
  return loadCustomProjectFromSource(
    createFileSystemCustomProjectSource(),
    resolve(
      manifestPath,
    ),
  );
}

export async function loadCustomProjectFromDirectory(
  projectDirectory:
    string,
): Promise<LoadedCustomProject> {
  return loadCustomProjectFromFile(
    resolveCustomProjectManifestPath(
      projectDirectory,
    ),
  );
}
