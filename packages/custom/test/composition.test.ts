import assert from "node:assert/strict";
import test from "node:test";

import type {
  ThemeDefinition,
} from "@staark/theme-kit";

import {
  composeCustomTheme,
  loadCustomRuntime,
} from "../src/index.ts";

const BaseSection = () =>
  null;

const CustomSection = () =>
  null;

const baseTheme:
  ThemeDefinition = {
  id:
    "base",

  name:
    "Base",

  presets: {
    default: {
      id:
        "default",

      name:
        "Default",

      tokens:
        {},
    },
  },

  defaultPreset:
    "default",

  sections: {
    hero:
      BaseSection,
  },
};

test(
  "custom runtime may override theme sections",
  () => {
    const runtime =
      loadCustomRuntime({
        theme: {
          family:
            "base",
        },

        overrides: {
          components:
            true,
        },
      });

    const theme =
      composeCustomTheme({
        runtime,
        baseTheme,

        sections: {
          hero:
            CustomSection,
        },
      });

    assert.equal(
      theme.sections.hero,
      CustomSection,
    );
  },
);

test(
  "component overrides stay disabled without capability",
  () => {
    const runtime =
      loadCustomRuntime({
        theme: {
          family:
            "base",
        },

        overrides: {
          components:
            false,
        },
      });

    const theme =
      composeCustomTheme({
        runtime,
        baseTheme,

        sections: {
          hero:
            CustomSection,
        },
      });

    assert.equal(
      theme.sections.hero,
      BaseSection,
    );
  },
);
