import assert from "node:assert/strict";
import test from "node:test";
import { kreatorBlockDefinitions } from "../src/blocks.ts";
import {
  kreatorBlockFields,
  kreatorBlockTemplates,
  kreatorRequiredFields,
} from "../src/admin.ts";

test("Blocks v2 stays in parity with the legacy Kreatör admin contract", () => {
  assert.deepEqual(
    kreatorBlockDefinitions.map((definition) => definition.type),
    kreatorBlockTemplates.map((template) => template.type),
  );

  for (const definition of kreatorBlockDefinitions) {
    assert.deepEqual(definition.fields, kreatorBlockFields[definition.type]);
    assert.deepEqual(
      definition.required ?? [],
      kreatorRequiredFields[definition.type] ?? [],
    );

    const legacy = kreatorBlockTemplates.find(
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
