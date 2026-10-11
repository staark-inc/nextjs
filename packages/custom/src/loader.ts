import {
  parseCustomRuntimeConfig,
  type CustomRuntimeConfig,
} from "./config.ts";

import {
  getCustomAddon,
  type CustomAddonDefinition,
} from "./registry.ts";

export type CustomRuntimeCapability =
  | "components"
  | "routes"
  | "styles"
  | "layouts"
  | "errors"
  | "navigation"
  | "theme-extensions";

export type LoadedCustomRuntime = {
  config:
    CustomRuntimeConfig;

  capabilities:
    CustomRuntimeCapability[];

  addons:
    CustomAddonDefinition[];

  unknownAddons:
    string[];

  custom:
    boolean;
};

function resolveCapabilities(
  config:
    CustomRuntimeConfig,
): CustomRuntimeCapability[] {
  const result:
    CustomRuntimeCapability[] = [];

  if (
    config.overrides.components
  ) {
    result.push(
      "components",
    );
  }

  if (
    config.overrides.routes
  ) {
    result.push(
      "routes",
    );
  }

  if (
    config.overrides.styles
  ) {
    result.push(
      "styles",
    );
  }

  if (
    config.overrides.layouts &&
    config.custom.allowCustomLayouts
  ) {
    result.push(
      "layouts",
    );
  }

  if (config.overrides.errors) result.push("errors");

  if (
    config.overrides.navigation
  ) {
    result.push(
      "navigation",
    );
  }

  if (
    config.custom.allowThemeExtensions
  ) {
    result.push(
      "theme-extensions",
    );
  }

  return result;
}

export function loadCustomRuntime(
  input: unknown,
): LoadedCustomRuntime {
  const config =
    parseCustomRuntimeConfig(
      input,
    );

  const addons:
    CustomAddonDefinition[] = [];

  const unknownAddons:
    string[] = [];

  for (
    const addon
    of config.addons
  ) {
    if (
      !addon.enabled
    ) {
      continue;
    }

    const definition =
      getCustomAddon(
        addon.key,
      );

    if (
      definition
    ) {
      addons.push(
        definition,
      );
    } else {
      unknownAddons.push(
        addon.key,
      );
    }
  }

  return {
    config,

    capabilities:
      resolveCapabilities(
        config,
      ),

    addons,

    unknownAddons,

    custom:
      config.mode ===
      "custom",
  };
}

export function hasCustomCapability(
  runtime:
    LoadedCustomRuntime,

  capability:
    CustomRuntimeCapability,
): boolean {
  return runtime.capabilities.includes(
    capability,
  );
}
