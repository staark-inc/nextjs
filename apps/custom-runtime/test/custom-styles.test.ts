import assert from "node:assert/strict";
import test from "node:test";

import {
  loadCustomProject,
} from "@staark/custom";

import {
  resolveCustomStyles,
} from "../lib/custom-styles.ts";

const styles = {
  css: ".demo { color: red; }",
};

test(
  "custom styles are exposed when styles capability is enabled",
  () => {
    const project =
      loadCustomProject({
        schema: "staark-custom/v1",

        project: {
          key: "styles-demo",
          name: "Styles Demo",
          version: "1.0.0",
        },

        runtime: {
          theme: {
            family: "light",
          },

          overrides: {
            styles: true,
          },
        },
      });

    const result =
      resolveCustomStyles(
        project,
        styles,
      );

    assert.equal(
      result?.css,
      styles.css,
    );
  },
);

test(
  "custom styles are blocked when styles capability is disabled",
  () => {
    const project =
      loadCustomProject({
        schema: "staark-custom/v1",

        project: {
          key: "styles-blocked",
          name: "Styles Blocked",
          version: "1.0.0",
        },

        runtime: {
          theme: {
            family: "light",
          },

          overrides: {
            styles: false,
          },
        },
      });

    const result =
      resolveCustomStyles(
        project,
        styles,
      );

    assert.equal(
      result,
      null,
    );
  },
);
