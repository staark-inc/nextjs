import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_PROJECT_SCHEMA,
  createCustomProjectManifest,
  loadCustomProject,
  parseCustomProjectManifest,
} from "../src/index.ts";

test(
  "custom project manifest parses valid v1 project",
  () => {
    const manifest =
      parseCustomProjectManifest({
        schema:
          "staark-custom/v1",

        project: {
          key:
            "lindberg-custom",

          name:
            "Lindberg Interiör",

          version:
            "1.0.0",
        },

        runtime: {
          theme: {
            family:
              "light",
          },
        },
      });

    assert.equal(
      manifest.schema,
      CUSTOM_PROJECT_SCHEMA,
    );

    assert.equal(
      manifest.project.key,
      "lindberg-custom",
    );

    assert.equal(
      manifest.runtime.mode,
      "custom",
    );
  },
);

test(
  "custom project manifest rejects unsupported schema",
  () => {
    assert.throws(
      () =>
        parseCustomProjectManifest({
          schema:
            "staark-custom/v2",

          project: {
            key:
              "test-project",

            name:
              "Test",

            version:
              "1.0.0",
          },

          runtime: {
            theme: {
              family:
                "light",
            },
          },
        }),
    );
  },
);

test(
  "custom project manifest validates project key",
  () => {
    assert.throws(
      () =>
        parseCustomProjectManifest({
          schema:
            "staark-custom/v1",

          project: {
            key:
              "Invalid Project",

            name:
              "Invalid",

            version:
              "1.0.0",
          },

          runtime: {
            theme: {
              family:
                "light",
            },
          },
        }),
      /Project key/,
    );
  },
);

test(
  "loaded custom project resolves runtime capabilities",
  () => {
    const project =
      loadCustomProject({
        schema:
          "staark-custom/v1",

        project: {
          key:
            "custom-demo",

          name:
            "Custom Demo",

          version:
            "1.0.0",
        },

        runtime: {
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
            allowCustomLayouts:
              true,

            allowThemeExtensions:
              true,
          },
        },
      });

    assert.equal(
      project.project.key,
      "custom-demo",
    );

    assert.equal(
      project.runtime.custom,
      true,
    );

    assert.ok(
      project.runtime.capabilities.includes(
        "components",
      ),
    );

    assert.ok(
      project.runtime.capabilities.includes(
        "layouts",
      ),
    );
  },
);

test(
  "custom project manifest creator injects schema",
  () => {
    const manifest =
      createCustomProjectManifest({
        project: {
          key:
            "created-project",

          name:
            "Created Project",

          version:
            "1.0.0",
        },

        runtime: {
          mode:
            "custom",

          theme: {
            family:
              "light",
          },

          addons:
            [],

          overrides: {
            components:
              false,

            routes:
              false,

            styles:
              true,

            layouts:
              false,

            navigation:
              false,
          },

          custom: {
            allowCustomLayouts:
              false,

            allowThemeExtensions:
              true,
          },
        },

        metadata: {
          customer:
            "demo",
        },
      });

    assert.equal(
      manifest.schema,
      "staark-custom/v1",
    );

    assert.equal(
      manifest.metadata.customer,
      "demo",
    );
  },
);
