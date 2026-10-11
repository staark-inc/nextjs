import assert from "node:assert/strict";
import test from "node:test";

import {
  getCustomAddon,
  hasCustomCapability,
  listCustomAddons,
  loadCustomRuntime,
  parseCustomRuntimeConfig,
  registerCustomAddon,
  resolveEnabledCustomAddons,
} from "../src/index.ts";

test(
  "custom runtime config applies defaults",
  () => {
    const config =
      parseCustomRuntimeConfig({
        theme: {
          family: "light",
        },
      });

    assert.equal(
      config.mode,
      "custom",
    );

    assert.equal(
      config.theme.family,
      "light",
    );

    assert.deepEqual(
      config.addons,
      [],
    );

    assert.deepEqual(
      config.overrides,
      {
        components: false,
        routes: false,
        styles: true,
        layouts: false,
        navigation: false,
      },
    );

    assert.deepEqual(
      config.custom,
      {
        allowCustomLayouts:
          false,

        allowThemeExtensions:
          true,
      },
    );
  },
);

test(
  "custom runtime config preserves explicit values",
  () => {
    const config =
      parseCustomRuntimeConfig({
        mode: "custom",

        theme: {
          family:
            "verkstad",

          variant:
            "dark",
        },

        addons: [
          {
            key:
              "booking",

            enabled:
              true,

            config: {
              layout:
                "compact",
            },
          },
        ],

        overrides: {
          components:
            true,

          routes:
            true,

          styles:
            false,

          layouts:
            true,

          navigation:
            true,
        },

        custom: {
          componentNamespace:
            "client-test",

          routeNamespace:
            "/custom",

          allowCustomLayouts:
            true,

          allowThemeExtensions:
            true,
        },
      });

    assert.equal(
      config.theme.variant,
      "dark",
    );

    assert.equal(
      config.overrides.layouts,
      true,
    );

    assert.equal(
      config.custom.routeNamespace,
      "/custom",
    );
  },
);

test(
  "custom addon registry registers and resolves addons",
  () => {
    registerCustomAddon({
      key:
        "test-booking",

      name:
        "Booking",

      description:
        "Test booking addon.",
    });

    assert.equal(
      getCustomAddon(
        "test-booking",
      )?.name,
      "Booking",
    );

    assert.ok(
      listCustomAddons()
        .some(
          (addon) =>
            addon.key ===
            "test-booking",
        ),
    );
  },
);

test(
  "custom addon registry rejects duplicate keys",
  () => {
    registerCustomAddon({
      key:
        "test-duplicate",

      name:
        "First",
    });

    assert.throws(
      () =>
        registerCustomAddon({
          key:
            "test-duplicate",

          name:
            "Second",
        }),

      /already registered/,
    );
  },
);

test(
  "only enabled registered addons are resolved",
  () => {
    registerCustomAddon({
      key:
        "test-enabled",

      name:
        "Enabled",
    });

    registerCustomAddon({
      key:
        "test-disabled",

      name:
        "Disabled",
    });

    const resolved =
      resolveEnabledCustomAddons([
        {
          key:
            "test-enabled",

          enabled:
            true,

          config: {},
        },

        {
          key:
            "test-disabled",

          enabled:
            false,

          config: {},
        },

        {
          key:
            "test-unknown",

          enabled:
            true,

          config: {},
        },
      ]);

    assert.deepEqual(
      resolved.map(
        (addon) =>
          addon.key,
      ),
      [
        "test-enabled",
      ],
    );
  },
);

test(
  "runtime loader exposes custom capabilities",
  () => {
    const runtime =
      loadCustomRuntime({
        theme: {
          family:
            "light",
        },

        overrides: {
          components:
            true,

          routes:
            true,

          styles:
            true,

          layouts:
            true,

          navigation:
            true,
        },

        custom: {
          componentNamespace:
            "lindberg",

          routeNamespace:
            "/custom",

          allowCustomLayouts:
            true,

          allowThemeExtensions:
            true,
        },
      });

    assert.equal(
      runtime.custom,
      true,
    );

    assert.equal(
      hasCustomCapability(
        runtime,
        "components",
      ),
      true,
    );

    assert.equal(
      hasCustomCapability(
        runtime,
        "routes",
      ),
      true,
    );

    assert.equal(
      hasCustomCapability(
        runtime,
        "layouts",
      ),
      true,
    );

    assert.equal(
      hasCustomCapability(
        runtime,
        "navigation",
      ),
      true,
    );

    assert.equal(
      hasCustomCapability(
        runtime,
        "theme-extensions",
      ),
      true,
    );
  },
);

test(
  "custom layouts require explicit permission",
  () => {
    const runtime =
      loadCustomRuntime({
        theme: {
          family:
            "light",
        },

        overrides: {
          layouts:
            true,
        },

        custom: {
          allowCustomLayouts:
            false,
        },
      });

    assert.equal(
      hasCustomCapability(
        runtime,
        "layouts",
      ),
      false,
    );
  },
);

test(
  "runtime loader reports unknown addons",
  () => {
    const runtime =
      loadCustomRuntime({
        theme: {
          family:
            "light",
        },

        addons: [
          {
            key:
              "does-not-exist",

            enabled:
              true,

            config:
              {},
          },
        ],
      });

    assert.deepEqual(
      runtime.unknownAddons,
      [
        "does-not-exist",
      ],
    );
  },
);
