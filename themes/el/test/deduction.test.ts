import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDeduction, formatKr } from "../src/deduction.ts";

test("ROT applies to labour only", () => {
  const r = computeDeduction({ kind: "rot", ratePercent: 30, capPerPerson: 50_000, labor: 20_000, material: 10_000, persons: 1 });
  assert.equal(r.base, 20_000);
  assert.equal(r.deduction, 6_000);
  assert.equal(r.pay, 24_000);
});

test("grön teknik applies to labour and material", () => {
  const r = computeDeduction({ kind: "green", ratePercent: 50, capPerPerson: 50_000, labor: 6_000, material: 14_000, persons: 1 });
  assert.equal(r.base, 20_000);
  assert.equal(r.deduction, 10_000);
  assert.equal(r.pay, 10_000);
});

test("caps per person", () => {
  const one = computeDeduction({ kind: "green", ratePercent: 15, capPerPerson: 50_000, labor: 100_000, material: 300_000, persons: 1 });
  assert.equal(one.deduction, 50_000);
  assert.equal(one.capped, true);
  const two = computeDeduction({ kind: "green", ratePercent: 15, capPerPerson: 50_000, labor: 100_000, material: 300_000, persons: 2 });
  assert.equal(two.deduction, 60_000);
  assert.equal(two.capped, false);
});

test("formats kronor", () => {
  assert.equal(formatKr(10000).replace(/\s/g, " "), "10 000 kr");
});
