import assert from "node:assert/strict";
import test from "node:test";
import { loadCustomProject, resolveCustomExtensions, type CustomExtensionDefinition } from "../src/index.ts";

function project(modules: string[], addons: string[] = [], key = "first") {
  return loadCustomProject({ schema: "staark-custom/v1", project: { key, name: key, version: "1" }, runtime: {
    theme: { family: "light" }, modules: modules.map(key => ({ key })), addons: addons.map(key => ({ key })),
  } });
}
test("dependencies resolve before dependents and services retain project identity", () => {
  const definitions: CustomExtensionDefinition[] = [
    { key: "booking", kind: "module", create: ({ project }) => ({ owner: project.project.key }) },
    { key: "sms", kind: "addon", requires: ["booking"] },
  ];
  const first = resolveCustomExtensions(project(["booking"], ["sms"]), definitions);
  const second = resolveCustomExtensions(project(["booking"], [], "second"), definitions);
  assert.deepEqual(first.definitions.map(item => item.key), ["booking", "sms"]);
  assert.deepEqual(first.services.get("booking"), { owner: "first" });
  assert.deepEqual(second.services.get("booking"), { owner: "second" });
  assert.notEqual(first.services.get("booking"), second.services.get("booking"));
});
test("unknown, wrong-kind, missing and cyclic dependencies fail", () => {
  assert.throws(() => resolveCustomExtensions(project(["missing"]), []), /Unknown module/);
  assert.throws(() => resolveCustomExtensions(project(["a"]), [{ key: "a", kind: "addon" }]), /Unknown module/);
  assert.throws(() => resolveCustomExtensions(project([], ["sms"]), [{ key: "sms", kind: "addon", requires: ["booking"] }]), /not enabled/);
  assert.throws(() => resolveCustomExtensions(project(["a", "b"]), [
    { key: "a", kind: "module", requires: ["b"] }, { key: "b", kind: "module", requires: ["a"] },
  ]), /cycle/);
});
test("conflicting sections fail before service construction", () => {
  let calls = 0;
  const section = () => null;
  assert.throws(() => resolveCustomExtensions(project(["a", "b"]), [
    { key: "a", kind: "module", sections: { demo: section }, create: () => { calls++; } },
    { key: "b", kind: "module", sections: { demo: section } },
  ]), /Duplicate extension section/);
  assert.equal(calls, 0);
});
