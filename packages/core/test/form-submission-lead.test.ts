import assert from "node:assert/strict";
import test from "node:test";
import { FormSubmissionSchema } from "../src/schema.ts";

const base = {
  formId: "lead-main",
  token: "1234567890abcdef",
  website: "",
  kind: "lead" as const,
  pageUrl: "https://example.com/kontakt",
};

test("lead submission accepts package field", () => {
  const parsed = FormSubmissionSchema.safeParse({
    ...base,
    fields: {
      name: "Costin Ionut",
      email: "costin@example.com",
      phone: "0746262452",
      company: "Staark Inc",
      package: "Business",
      message: "Test project",
    },
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.kind, "lead");
    assert.equal(parsed.data.fields.package, "Business");
  }
});

test("lead submission rejects booking-only fields", () => {
  const parsed = FormSubmissionSchema.safeParse({
    ...base,
    fields: {
      name: "Costin Ionut",
      email: "costin@example.com",
      booking_type: "Business",
      message: "Test project",
    },
  });

  assert.equal(parsed.success, false);
});
