import type {
  CustomAddon,
} from "./config.ts";

export type CustomAddonDefinition = {
  key: string;
  name: string;
  description?: string;
};

const registry =
  new Map<
    string,
    CustomAddonDefinition
  >();

export function registerCustomAddon(
  definition:
    CustomAddonDefinition,
): void {
  const key =
    definition.key
      .trim();

  if (!key) {
    throw new Error(
      "Custom addon key is required.",
    );
  }

  if (
    registry.has(
      key,
    )
  ) {
    throw new Error(
      `Custom addon "${key}" is already registered.`,
    );
  }

  registry.set(
    key,
    {
      ...definition,
      key,
    },
  );
}

export function getCustomAddon(
  key: string,
): CustomAddonDefinition | null {
  return (
    registry.get(
      key,
    ) ??
    null
  );
}

export function listCustomAddons():
CustomAddonDefinition[] {
  return Array.from(
    registry.values(),
  );
}

export function resolveEnabledCustomAddons(
  addons:
    readonly CustomAddon[],
): CustomAddonDefinition[] {
  return addons
    .filter(
      (addon) =>
        addon.enabled,
    )
    .map(
      (addon) =>
        getCustomAddon(
          addon.key,
        ),
    )
    .filter(
      (
        addon,
      ): addon is
        CustomAddonDefinition =>
        addon !== null,
    );
}
