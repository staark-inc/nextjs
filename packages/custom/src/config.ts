import {
  z,
} from "zod";

export const CustomRuntimeModeSchema =
  z.enum([
    "saas",
    "custom",
  ]);

export type CustomRuntimeMode =
  z.infer<
    typeof CustomRuntimeModeSchema
  >;

export const CustomAddonSchema =
  z.object({
    key:
      z.string()
        .trim()
        .min(1),

    enabled:
      z.boolean()
        .default(true),

    config:
      z.record(
        z.string(),
        z.unknown(),
      )
        .default({}),
  });

export type CustomAddon =
  z.infer<
    typeof CustomAddonSchema
  >;

export const CustomOverridesSchema =
  z.object({
    components:
      z.boolean()
        .default(false),

    routes:
      z.boolean()
        .default(false),

    styles:
      z.boolean()
        .default(true),

    layouts:
      z.boolean()
        .default(false),

    errors:
      z.boolean()
        .default(false),

    navigation:
      z.boolean()
        .default(false),
  });

export type CustomOverrides =
  z.infer<
    typeof CustomOverridesSchema
  >;

export const CustomExtensionSchema =
  z.object({
    componentNamespace:
      z.string()
        .trim()
        .min(1)
        .optional(),

    routeNamespace:
      z.string()
        .trim()
        .startsWith("/")
        .optional(),

    allowCustomLayouts:
      z.boolean()
        .default(false),

    allowThemeExtensions:
      z.boolean()
        .default(true),
  });

export type CustomExtension =
  z.infer<
    typeof CustomExtensionSchema
  >;

export const CustomRuntimeConfigSchema =
  z.object({
    mode:
      CustomRuntimeModeSchema
        .default("custom"),

    theme:
      z.object({
        family:
          z.string()
            .trim()
            .min(1),

        variant:
          z.string()
            .trim()
            .min(1)
            .optional(),
      }),

    modules: z.array(CustomAddonSchema).default([]),

    integrations: z.array(z.object({
      key: z.string().trim().min(1),
      enabled: z.boolean().default(true),
      baseUrl: z.url().refine(value => new URL(value).protocol === "https:", "API integrations require HTTPS"),
      tokenEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
      timeoutMs: z.number().int().min(100).max(60000).default(10000),
    })).default([]),

    addons:
      z.array(
        CustomAddonSchema,
      )
        .default([]),

    overrides:
      CustomOverridesSchema
        .default({
          components: false,
          routes: false,
          styles: true,
          layouts: false,
          errors: false,
          navigation: false,
        }),

    custom:
      CustomExtensionSchema
        .default({
          allowCustomLayouts: false,
          allowThemeExtensions: true,
        }),
  });

export type CustomRuntimeConfig =
  z.infer<
    typeof CustomRuntimeConfigSchema
  >;

export function parseCustomRuntimeConfig(
  input: unknown,
): CustomRuntimeConfig {
  return CustomRuntimeConfigSchema.parse(
    input,
  );
}
