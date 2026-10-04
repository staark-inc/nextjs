import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNewsUrl } from "../lib/news-policy.ts";

test("news destinations block active content and off-origin relative URLs", () => {
  for (const url of ["javascript:alert(1)", "data:image/svg+xml,test", "//evil.test/path", "https://user:pass@example.test", "/\\evil", "java\nscript:alert(1)"]) {
    assert.equal(safeNewsUrl(url), "");
    assert.equal(safeNewsUrl(url, true), "");
  }
  assert.equal(safeNewsUrl("mailto:hello@example.test", true), "");
  assert.equal(safeNewsUrl("/admin/analytics"), "/admin/analytics");
  assert.equal(safeNewsUrl("https://example.test/news.webp", true), "https://example.test/news.webp");
});
