import assert from "node:assert/strict";

import test from "node:test";

import {
  resolveCustomProjectSource,
} from "../lib/custom-project.ts";

test(
  "custom runtime prefers explicit manifest path",
  () => {
    const source =
      resolveCustomProjectSource({
        STAARK_CUSTOM_MANIFEST_PATH:
          "/tmp/project/custom.json",

        STAARK_CUSTOM_PROJECT_DIR:
          "/tmp/project",
      });

    assert.equal(
      source.type,
      "file",
    );

    assert.equal(
      source.location,
      "/tmp/project/custom.json",
    );
  },
);

test(
  "custom runtime accepts project directory",
  () => {
    const source =
      resolveCustomProjectSource({
        STAARK_CUSTOM_PROJECT_DIR:
          "/tmp/custom-project",
      });

    assert.equal(
      source.type,
      "directory",
    );

    assert.equal(
      source.location,
      "/tmp/custom-project",
    );
  },
);
