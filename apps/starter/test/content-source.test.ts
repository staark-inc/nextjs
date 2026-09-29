import test from "node:test";
import assert from "node:assert/strict";

import { resolvePublicContentConfig } from "../lib/content-source.ts";

test("public content stays legacy by default", () => {
  assert.deepEqual(resolvePublicContentConfig({}), {
    source: "legacy",
    fallback: "none",
    siteKey: "",
  });
});

test("postgres public reads require the imported site key", () => {
  assert.throws(
    () => resolvePublicContentConfig({ STAARK_DATA_SOURCE: "postgres" }),
    /requires STAARK_SITE_KEY/,
  );

  assert.deepEqual(
    resolvePublicContentConfig({
      STAARK_DATA_SOURCE: "postgres",
      STAARK_DATA_FALLBACK: "legacy",
      STAARK_SITE_KEY: "Kreator-Demo",
    }),
    {
      source: "postgres",
      fallback: "legacy",
      siteKey: "kreator-demo",
    },
  );
});

test("public content config rejects unknown cutover values", () => {
  assert.throws(
    () => resolvePublicContentConfig({ STAARK_DATA_SOURCE: "database" }),
    /STAARK_DATA_SOURCE must be one of/,
  );
  assert.throws(
    () => resolvePublicContentConfig({ STAARK_DATA_FALLBACK: "yes" }),
    /STAARK_DATA_FALLBACK must be one of/,
  );
  assert.throws(
    () =>
      resolvePublicContentConfig({
        STAARK_DATA_SOURCE: "postgres",
        STAARK_SITE_KEY: "bad key!",
      }),
    /STAARK_SITE_KEY/,
  );
});
