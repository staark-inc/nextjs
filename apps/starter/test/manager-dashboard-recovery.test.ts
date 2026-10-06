import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../lib/admin-manager-dashboard.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Manager dashboard tolerates media tenant resolution failure",
  () => {
    assert.match(
      source,
      /await safe\(\s*resolveAdminMediaSiteId,\s*null,/,
    );
  },
);

test(
  "Manager dashboard keeps subsystem fallbacks",
  () => {
    assert.match(
      source,
      /safe\(\s*loadManagerContent/,
    );

    assert.match(
      source,
      /safe\(runSiteHealth,\s*null\)/,
    );

    assert.match(
      source,
      /safe\(listRedirects/,
    );
  },
);
