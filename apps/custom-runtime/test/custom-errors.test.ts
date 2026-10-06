import assert from "node:assert/strict";
import test from "node:test";
import { loadCustomProject } from "@staark/custom";
import { createErrorPresentation, resolveCustomErrorPages, errorReference } from "../lib/custom-errors.ts";
const NotFound = () => null;
const ErrorView = () => null;
function project(key = "demo", errors = false) {
  return loadCustomProject({ schema: "staark-custom/v1", project: { key, name: "Project", version: "1" }, runtime: { theme: { family: "custom-base" }, overrides: { errors, layouts: false }, addons: [{ key: "forms", config: { secret: "never-public" } }] } });
}
test("error overrides are opt-in and independent of layouts", () => {
  const registry = { demo: { notFound: NotFound, error: ErrorView } };
  const disabled = createErrorPresentation(project(), "Brand");
  assert.deepEqual(resolveCustomErrorPages(disabled, registry), {});
  const enabledProject = project("demo", true);
  assert.ok(enabledProject.runtime.capabilities.includes("errors"));
  assert.ok(!enabledProject.runtime.capabilities.includes("layouts"));
  const enabled = createErrorPresentation(enabledProject, "Brand");
  assert.equal(resolveCustomErrorPages(enabled, registry).error, ErrorView);
});
test("registry never borrows another project's views; partial overrides allow individual fallback", () => {
  const registry = { demo: { notFound: NotFound } };
  assert.deepEqual(resolveCustomErrorPages(createErrorPresentation(project("other", true), "Other"), registry), {});
  assert.deepEqual(resolveCustomErrorPages(null, registry), {});
  assert.equal(resolveCustomErrorPages(createErrorPresentation(project("demo", true), "Demo"), registry).error, undefined);
});
test("serialized boundary presentation exposes no runtime config or addon secrets", () => {
  const presentation = createErrorPresentation(project("demo", true), "Brand", { color: "#123456" });
  assert.deepEqual(presentation, { project: { key: "demo", name: "Brand" }, allowOverrides: true, style: { color: "#123456" } });
  assert.ok(!JSON.stringify(presentation).includes("never-public"));
});
test("only bounded framework digests can be used as a support reference", () => {
  assert.equal(errorReference("123456789"), "123456789");
  for (const value of [undefined, "", "Password: secret", "<script>", "x".repeat(81)]) assert.equal(errorReference(value), undefined);
});
