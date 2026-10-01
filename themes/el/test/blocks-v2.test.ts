import assert from "node:assert/strict";
import test from "node:test";
import { elBlockDefinitions } from "../src/blocks.ts";
import {
  elBlockFields,
  elBlockTemplates,
  elRequiredFields,
} from "../src/admin.ts";

test("Blocks v2 stays in parity with the legacy El admin contract", () => {
  assert.deepEqual(
    elBlockDefinitions.map((definition) => definition.type),
    elBlockTemplates.map((template) => template.type),
  );

  for (const definition of elBlockDefinitions) {
    assert.deepEqual(definition.fields, elBlockFields[definition.type]);
    assert.deepEqual(definition.required ?? [], elRequiredFields[definition.type] ?? []);

    const legacy = elBlockTemplates.find(
      (template) => template.type === definition.type,
    );
    assert.ok(legacy);
    assert.deepEqual(
      {
        type: definition.type,
        label: definition.label,
        description: definition.description ?? "",
        icon: definition.icon ?? "layout",
        template: definition.defaults,
      },
      legacy,
    );
  }
});
