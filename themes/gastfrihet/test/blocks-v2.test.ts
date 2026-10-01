import assert from "node:assert/strict";
import test from "node:test";

import { gastfrihetBlockDefinitions } from "../src/blocks.ts";

test("gastfrihet publishes exactly its two theme-owned Blocks v2 definitions", () => {
  assert.deepEqual(
    gastfrihetBlockDefinitions.map((definition) => definition.type),
    ["rooms", "amenities"],
  );
});

test("rooms default satisfies the renderer-facing shape", () => {
  const definition = gastfrihetBlockDefinitions.find(
    (item) => item.type === "rooms",
  );
  assert.ok(definition);
  assert.equal(definition.required.includes("heading"), true);
  assert.equal(definition.defaults.rooms[0]?.name, "Standardrum");
  assert.ok(Array.isArray(definition.defaults.rooms[0]?.amenities));
});

test("amenities default keeps heading, intro and item labels", () => {
  const definition = gastfrihetBlockDefinitions.find(
    (item) => item.type === "amenities",
  );
  assert.ok(definition);
  assert.equal(definition.defaults.heading, "Bekvämligheter");
  assert.equal(definition.defaults.items[0]?.label, "Frukost ingår");
});
