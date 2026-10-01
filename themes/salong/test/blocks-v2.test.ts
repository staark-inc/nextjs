import assert from "node:assert/strict";
import test from "node:test";

import { salongBlockDefinitions } from "../src/blocks.ts";

test("salong publishes exactly its two theme-owned Blocks v2 definitions", () => {
  assert.deepEqual(
    salongBlockDefinitions.map((definition) => definition.type),
    ["priceList", "gallery"],
  );
});

test("priceList definition matches the renderer groups contract", () => {
  const definition = salongBlockDefinitions.find(
    (item) => item.type === "priceList",
  );
  assert.ok(definition);

  const fieldNames = definition.fields.map((field) => field.name);
  assert.equal(fieldNames.includes("groups"), true);
  assert.equal(fieldNames.includes("categories"), false);

  const groups = definition.defaults.groups;
  assert.ok(Array.isArray(groups));
  assert.equal(groups.length > 0, true);
  assert.equal(groups[0]?.title, "Klippning");
  assert.ok(Array.isArray(groups[0]?.items));
});

test("gallery keeps empty images as a valid picker default", () => {
  const definition = salongBlockDefinitions.find(
    (item) => item.type === "gallery",
  );
  assert.ok(definition);
  assert.deepEqual(definition.defaults.images, []);
});
