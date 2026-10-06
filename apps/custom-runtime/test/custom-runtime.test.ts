import assert from "node:assert/strict";

import test from "node:test";

import {
  resolveCustomProjectSource,
} from "../lib/custom-project.ts";

test("shared root selects a project without permitting traversal", () => {
  assert.deepEqual(resolveCustomProjectSource({ STAARK_CUSTOM_PROJECTS_ROOT: "/srv/projects", STAARK_CUSTOM_PROJECT_KEY: "salon" }), {
    type: "directory", location: "/srv/projects/salon",
  });
  for (const key of ["../other", "/etc", "a/b", "UPPER"]) {
    assert.throws(() => resolveCustomProjectSource({ STAARK_CUSTOM_PROJECTS_ROOT: "/srv/projects", STAARK_CUSTOM_PROJECT_KEY: key }), /valid PROJECT_KEY/);
  }
  assert.throws(() => resolveCustomProjectSource({ STAARK_CUSTOM_PROJECTS_ROOT: "/srv/projects" }), /valid PROJECT_KEY/);
});

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
