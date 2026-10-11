import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import test from "node:test";

import {
  CUSTOM_PROJECT_MANIFEST_FILE,
  CustomProjectSourceError,
  loadCustomProjectFromDirectory,
  loadCustomProjectFromSource,
} from "../src/source.ts";

test(
  "project source loads valid manifest from filesystem",
  async () => {
    const directory =
      await mkdtemp(
        join(
          tmpdir(),
          "staark-custom-",
        ),
      );

    try {
      await writeFile(
        join(
          directory,
          CUSTOM_PROJECT_MANIFEST_FILE,
        ),

        JSON.stringify({
          schema:
            "staark-custom/v1",

          project: {
            key:
              "filesystem-demo",

            name:
              "Filesystem Demo",

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

        "utf8",
      );

      const project =
        await loadCustomProjectFromDirectory(
          directory,
        );

      assert.equal(
        project.project.key,
        "filesystem-demo",
      );

      assert.equal(
        project.runtime.custom,
        true,
      );
    } finally {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

test(
  "project source reports missing filesystem manifest",
  async () => {
    const directory =
      await mkdtemp(
        join(
          tmpdir(),
          "staark-custom-",
        ),
      );

    try {
      await assert.rejects(
        () =>
          loadCustomProjectFromDirectory(
            directory,
          ),

        (
          error:
            unknown,
        ) => {
          assert.ok(
            error instanceof
              CustomProjectSourceError,
          );

          assert.equal(
            error.code,
            "NOT_FOUND",
          );

          return true;
        },
      );
    } finally {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

test(
  "project source reports malformed JSON",
  async () => {
    await assert.rejects(
      () =>
        loadCustomProjectFromSource(
          {
            async read() {
              return (
                "{ this is not json"
              );
            },
          },

          "memory://broken",
        ),

      (
        error:
          unknown,
      ) => {
        assert.ok(
          error instanceof
            CustomProjectSourceError,
        );

        assert.equal(
          error.code,
          "INVALID_JSON",
        );

        return true;
      },
    );
  },
);

test(
  "project source reports schema-invalid manifest",
  async () => {
    await assert.rejects(
      () =>
        loadCustomProjectFromSource(
          {
            async read() {
              return JSON.stringify({
                schema:
                  "staark-custom/v999",

                project: {
                  key:
                    "invalid-schema",

                  name:
                    "Invalid Schema",

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
            },
          },

          "memory://invalid",
        ),

      (
        error:
          unknown,
      ) => {
        assert.ok(
          error instanceof
            CustomProjectSourceError,
        );

        assert.equal(
          error.code,
          "INVALID_MANIFEST",
        );

        return true;
      },
    );
  },
);
