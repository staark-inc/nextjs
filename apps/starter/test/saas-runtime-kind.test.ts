import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSaaSRuntimeKind } from "../lib/saas-runtime-kind";

test("SaaS Runtime accepts explicit SaaS discriminator", () => {
  assert.doesNotThrow(() => assertSaaSRuntimeKind("saas"));
});

test("SaaS Runtime accepts legacy missing discriminator during rollout", () => {
  assert.doesNotThrow(() => assertSaaSRuntimeKind(undefined));
});

test("SaaS Runtime rejects Custom and malformed runtime discriminators", () => {
  for (const value of ["custom", null, "", "business", 0, {}]) {
    assert.throws(() => assertSaaSRuntimeKind(value), /Unsupported runtimeKind/);
  }
});
