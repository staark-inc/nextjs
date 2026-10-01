import assert from "node:assert/strict";
import test from "node:test";

import { inferSubmissionKind } from "@staark/core";

test("legacy contact payload stays contact", () => {
  assert.equal(inferSubmissionKind("contact", { name: "Ada" }), "contact");
});

test("booking fields infer booking kind", () => {
  assert.equal(
    inferSubmissionKind("request", { booking_date: "2026-10-01" }),
    "booking",
  );
});
