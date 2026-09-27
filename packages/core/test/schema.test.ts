import { test } from "node:test";
import assert from "node:assert/strict";
import { SiteSettingsSchema } from "../src/schema.ts";

test("SiteSettingsSchema preserves Theme Studio provenance", () => {
  const parsed = SiteSettingsSchema.parse({
    name: "Staark Demo",
    url: "https://example.com",
    theme: {
      preset: "default",
      studio: {
        id: "brand-v2",
        name: "Brand V2",
        sourceUpdatedAt: "2026-09-27T08:00:00.000Z",
        appliedAt: "2026-09-27T08:05:00.000Z",
      },
    },
    contact: {
      email: "hello@example.com",
    },
  });

  assert.deepEqual(parsed.theme.studio, {
    id: "brand-v2",
    name: "Brand V2",
    sourceUpdatedAt: "2026-09-27T08:00:00.000Z",
    appliedAt: "2026-09-27T08:05:00.000Z",
  });
});
