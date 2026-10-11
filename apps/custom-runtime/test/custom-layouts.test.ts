import assert from "node:assert/strict";
import test from "node:test";

import {
  loadCustomProject,
} from "@staark/custom";

import {
  resolveCustomLayouts,
} from "../lib/custom-layouts.ts";

const Header =
  () => null;

test(
  "custom layouts are exposed when layouts capability is enabled",
  () => {
    const project =
      loadCustomProject({
        schema:
          "staark-custom/v1",

        project: {
          key:
            "layout-demo",

          name:
            "Layout Demo",

          version:
            "1.0.0",
        },

        runtime: {
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
              true,
          },
        },
      });

    const layouts =
      resolveCustomLayouts(
        project,
        {
          header:
            Header,
        },
      );

    assert.equal(
      layouts.header,
      Header,
    );
  },
);

test(
  "custom layouts are blocked without layouts capability",
  () => {
    const project =
      loadCustomProject({
        schema:
          "staark-custom/v1",

        project: {
          key:
            "layout-blocked",

          name:
            "Layout Blocked",

          version:
            "1.0.0",
        },

        runtime: {
          theme: {
            family:
              "light",
          },

          overrides: {
            layouts:
              false,
          },

          custom: {
            allowCustomLayouts:
              true,
          },
        },
      });

    const layouts =
      resolveCustomLayouts(
        project,
        {
          header:
            Header,
        },
      );

    assert.deepEqual(
      layouts,
      {},
    );
  },
);
