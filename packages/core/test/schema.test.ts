import { test } from "node:test";
import assert from "node:assert/strict";
import { FormSubmissionSchema, SiteSettingsSchema } from "../src/schema.ts";

test("SiteSettingsSchema preserves Theme Studio provenance", () => {
  const parsed = SiteSettingsSchema.parse({
    name: "Staark Demo",
    url: "https://example.com",
    theme: {
      family: "webb",
      preset: "default",
      studio: {
        id: "brand-v2",
        name: "Brand V2",
        sourceUpdatedAt: "2026-09-27T08:00:00.000Z",
        appliedAt: "2026-09-27T08:05:00.000Z",
      },
    },
    contact: {
      email: "hello@example.com",
    },
  });

  assert.equal(parsed.theme.family, "webb");
  assert.deepEqual(parsed.theme.studio, {
    id: "brand-v2",
    name: "Brand V2",
    sourceUpdatedAt: "2026-09-27T08:00:00.000Z",
    appliedAt: "2026-09-27T08:05:00.000Z",
  });
});


test("SiteSettingsSchema validates and defaults websiteType", () => {
  const base = {
    name: "Staark Demo",
    url: "https://example.com",
    contact: { email: "hello@example.com" },
  };

  assert.equal(SiteSettingsSchema.parse(base).websiteType, "business");
  assert.equal(SiteSettingsSchema.parse({ ...base, websiteType: "salon" }).websiteType, "salon");
  assert.equal(SiteSettingsSchema.safeParse({ ...base, websiteType: "spaceship" }).success, false);
});


test("FormSubmissionSchema separates submission kinds", () => {
  const base = {
    formId: "contact-main",
    token: "0123456789abcdef",
    website: "",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      message: "Hej",
    },
  };

  assert.equal(FormSubmissionSchema.parse(base).kind, "contact");
  assert.equal(FormSubmissionSchema.parse({ ...base, kind: "lead" }).kind, "lead");

  const booking = FormSubmissionSchema.parse({
    ...base,
    kind: "booking",
    formId: "salon-booking",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      booking_date: "2026-10-10",
      booking_time: "13:30",
    },
  });
  assert.equal(booking.kind, "booking");

  const legacyBooking = FormSubmissionSchema.parse({
    ...base,
    formId: "salong-bokning",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      booking_date: "2026-10-10",
    },
  });
  assert.equal(legacyBooking.kind, "booking");

  assert.equal(
    FormSubmissionSchema.safeParse({
      ...base,
      kind: "contact",
      fields: { ...base.fields, booking_date: "2026-10-10" },
    }).success,
    false,
  );
});


test("FormSubmissionSchema routes typed forms", () => {
  const contact = FormSubmissionSchema.parse({
    formId: "contact-main",
    kind: "contact",
    token: "0123456789abcdef",
    website: "",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      message: "Hej",
    },
  });
  assert.equal(contact.kind, "contact");

  const lead = FormSubmissionSchema.parse({
    formId: "quote-main",
    kind: "lead",
    token: "0123456789abcdef",
    website: "",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      company: "Example AB",
    },
  });
  assert.equal(lead.kind, "lead");

  const booking = FormSubmissionSchema.parse({
    formId: "booking-main",
    kind: "booking",
    token: "0123456789abcdef",
    website: "",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      booking_date: "2026-10-10",
      booking_time: "13:30",
      booking_item: "Klippning",
    },
  });
  assert.equal(booking.kind, "booking");

  assert.equal(
    FormSubmissionSchema.safeParse({
      formId: "contact-main",
      kind: "contact",
      token: "0123456789abcdef",
      website: "",
      fields: {
        name: "Anna",
        email: "anna@example.com",
        booking_date: "2026-10-10",
      },
    }).success,
    false,
  );
});

test("FormSubmissionSchema keeps legacy submissions readable", () => {
  const parsed = FormSubmissionSchema.parse({
    formId: "salong-bokning",
    token: "0123456789abcdef",
    website: "",
    fields: {
      name: "Anna",
      email: "anna@example.com",
      booking_date: "2026-10-10",
    },
  });

  assert.equal(parsed.kind, "booking");
});
