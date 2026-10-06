import assert from "node:assert/strict";
import test from "node:test";
import { customBaseBlockDefinitions, customBaseBlockSchemas, customBaseShortcuts, createCustomBaseBlock } from "../src/blocks.ts";
import { customBasePresets } from "../src/presets.ts";
import customBaseManifest from "../src/manifest.ts";

test("every block definition has valid defaults and a matching manifest entry", () => {
  assert.equal(customBaseBlockDefinitions.length, 7);
  assert.deepEqual(new Set(customBaseBlockDefinitions.map(item => item.type)), new Set(customBaseManifest.blocks));
  for (const definition of customBaseBlockDefinitions) {
    assert.doesNotThrow(() => createCustomBaseBlock(definition.type, definition.type));
    assert.ok(customBaseBlockSchemas[definition.type as keyof typeof customBaseBlockSchemas]);
    for (const preset of definition.presets ?? []) assert.doesNotThrow(() => createCustomBaseBlock(definition.type, definition.type, {}, preset.id));
  }
});
test("shortcuts create independent blocks without mutating shared defaults", () => {
  for (const [shortcut, type] of Object.entries(customBaseShortcuts)) assert.equal(createCustomBaseBlock(shortcut, shortcut).type, type);
  const first = createCustomBaseBlock("features", "first");
  const second = createCustomBaseBlock("features", "second");
  assert.notEqual(first.props, second.props);
  assert.notEqual(first.props.items, second.props.items);
  (first.props.items as { title: string }[])[0]!.title = "Changed";
  assert.notEqual((second.props.items as { title: string }[])[0]!.title, "Changed");
});
test("unknown blocks, presets and unsafe links fail; type-only preset disables artwork", () => {
  assert.throws(() => createCustomBaseBlock("missing", "x"), /Unknown Custom block/);
  assert.throws(() => createCustomBaseBlock("intro", "x", {}, "missing"), /Unknown block preset/);
  assert.throws(() => createCustomBaseBlock("intro", ""), /Block id/);
  assert.throws(() => createCustomBaseBlock("contact", "x", { link: { label: "Bad", href: "javascript:alert(1)" } }));
  assert.throws(() => createCustomBaseBlock("contact", "x", { link: { label: "Bad", href: "//evil.example" } }));
  assert.equal(createCustomBaseBlock("intro", "x", {}, "type-only").props.artwork, false);
});
test("presets provide the same token keys and different colors", () => {
  assert.deepEqual(Object.keys(customBasePresets), ["studio", "midnight", "gallery"]);
  const studio = customBasePresets.studio!;
  for (const preset of Object.values(customBasePresets)) assert.deepEqual(Object.keys(preset.tokens.colors!), Object.keys(studio.tokens.colors!));
  assert.notEqual(studio.tokens.colors!.paper, customBasePresets.midnight!.tokens.colors!.paper);
  assert.equal(customBaseManifest.parentId, undefined);
});
