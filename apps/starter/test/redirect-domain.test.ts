import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRedirects,
  normalizeRedirectPath,
  sanitizeRedirectRule,
} from "../lib/redirect-domain.ts";

test("redirect paths normalize duplicate/trailing slashes", () => {
  assert.equal(normalizeRedirectPath("/old//page/"), "/old/page");
});

test("redirect domain rejects loops", () => {
  const a = sanitizeRedirectRule({ from: "/a", to: "/b" });
  const b = sanitizeRedirectRule({ from: "/b", to: "/a" });
  assert.equal(
    inspectRedirects([a, b]).some((issue) => issue.severity === "error"),
    true,
  );
});

test("redirect chains are warnings, not errors", () => {
  const a = sanitizeRedirectRule({ from: "/a", to: "/b" });
  const b = sanitizeRedirectRule({ from: "/b", to: "/c" });
  const issues = inspectRedirects([a, b]);
  assert.equal(issues.some((issue) => issue.severity === "warning"), true);
  assert.equal(issues.some((issue) => issue.severity === "error"), false);
});
