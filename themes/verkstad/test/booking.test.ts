import { test } from "node:test";
import assert from "node:assert/strict";
import { buildServiceBooking, normalizePlate } from "../src/booking.ts";

test("normalizes Swedish plates", () => {
  assert.equal(normalizePlate("abc123"), "ABC 123");
  assert.equal(normalizePlate("ABC 12a"), "ABC 12A");
  assert.equal(normalizePlate("ab-c123"), "ABC 123");
  assert.equal(normalizePlate("AB 1234"), null);
  assert.equal(normalizePlate(""), null);
});

test("maps a workshop booking onto whitelisted fields", () => {
  const f = buildServiceBooking({
    plate: "abc123", car: "Volvo V60", mileage: "12 300", services: ["Service", "Däckbyte"],
    date: "2026-10-05", dropOff: "07:30", loanCar: true, name: " Jonas ", email: "j@example.com", message: "Gnissel fram",
  });
  assert.equal(f.booking_item, "ABC 123");
  assert.equal(f.booking_type, "Service, Däckbyte");
  assert.equal(f.booking_date, "2026-10-05");
  assert.equal(f.booking_time, "07:30");
  assert.equal(f.subject, "Verkstadsbokning: ABC 123");
  assert.equal(f.name, "Jonas");
  assert.equal(f.message, "Bil: ABC 123 · Volvo V60 · 12 300 mil\nTjänster: Service, Däckbyte\nLånebil: Ja\n\nGnissel fram");
  assert.equal(f.phone, undefined);
});

test("keeps booking_type within the 80-character limit", () => {
  const many = Array.from({ length: 12 }, (_, i) => `Tjänst nummer ${i + 1}`);
  const f = buildServiceBooking({ plate: "ABC123", services: many, date: "", dropOff: "", loanCar: false, name: "A", email: "a@b.se" });
  assert.ok(f.booking_type!.length <= 80);
  assert.equal(f.booking_date, undefined);
});
