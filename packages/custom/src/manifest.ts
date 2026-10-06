import {
  z,
} from "zod";

import {
  CustomRuntimeConfigSchema,
  type CustomRuntimeConfig,
} from "./config.ts";

import {
  loadCustomRuntime,
  type LoadedCustomRuntime,
} from "./loader.ts";

export const CUSTOM_PROJECT_SCHEMA =
  "staark-custom/v1" as const;

export const CustomProjectIdentitySchema =
  z.object({
    key:
      z.string()
        .trim()
        .min(1)
        .regex(
          /^[a-z0-9][a-z0-9-]*$/,
          "Project key must contain lowercase letters, numbers and hyphens only.",
        ),

    name:
      z.string()
        .trim()
        .min(1),

    version:
      z.string()
        .trim()
        .min(1),

    description:
      z.string()
        .trim()
        .min(1)
        .optional(),
  });

export type CustomProjectIdentity =
  z.infer<
    typeof CustomProjectIdentitySchema
  >;

export const CustomProjectManifestSchema =
  z.object({
    schema:
      z.literal(
        CUSTOM_PROJECT_SCHEMA,
      ),

    project:
      CustomProjectIdentitySchema,

    runtime:
      CustomRuntimeConfigSchema,

    metadata:
      z.record(
        z.string(),
        z.unknown(),
      )
        .default({}),
  });

export type CustomProjectManifest =
  z.infer<
    typeof CustomProjectManifestSchema
  >;

export type LoadedCustomProject = {
  manifest:
    CustomProjectManifest;

  project:
    CustomProjectIdentity;

  runtime:
    LoadedCustomRuntime;

  schema:
    typeof CUSTOM_PROJECT_SCHEMA;
};

export function parseCustomProjectManifest(
  input: unknown,
): CustomProjectManifest {
  return CustomProjectManifestSchema.parse(
    input,
  );
}

export function loadCustomProject(
  input: unknown,
): LoadedCustomProject {
  const manifest =
    parseCustomProjectManifest(
      input,
    );

  return {
    manifest,

    project:
      manifest.project,

    runtime:
      loadCustomRuntime(
        manifest.runtime,
      ),

    schema:
      manifest.schema,
  };
}

export function createCustomProjectManifest(
  input: {
    project:
      CustomProjectIdentity;

    runtime:
      CustomRuntimeConfig;

    metadata?: Record<
      string,
      unknown
    >;
  },
): CustomProjectManifest {
  return parseCustomProjectManifest({
    schema:
      CUSTOM_PROJECT_SCHEMA,

    project:
      input.project,

    runtime:
      input.runtime,

    metadata:
      input.metadata ??
      {},
  });
}
