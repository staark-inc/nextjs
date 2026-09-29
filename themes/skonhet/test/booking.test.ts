import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBookingFields, localToday, NO_PREFERENCE } from "../src/booking.ts";

const base = { service: "Gelémanikyr", date: "2026-10-02", time: "14:00", name: " Ella ", email: "ella@example.com " };

test("maps a booking onto whitelisted form fields", () => {
  assert.deepEqual(buildBookingFields({ ...base, stylist: "Noor", phone: "070-111 22 33", message: "Nude färg" }), {
    name: "Ella",
    email: "ella@example.com",
    subject: "Bokningsförfrågan: Gelémanikyr",
    booking_type: "Gelémanikyr",
    booking_date: "2026-10-02",
    booking_time: "14:00",
    booking_item: "Noor",
    phone: "070-111 22 33",
    message: "Nude färg",
  });
});

test("drops 'no preference', empty optionals and malformed date/time", () => {
  const f = buildBookingFields({ ...base, stylist: NO_PREFERENCE, date: "2/10", time: "2pm", phone: " " });
  assert.equal(f.booking_item, undefined);
  assert.equal(f.booking_date, undefined);
  assert.equal(f.booking_time, undefined);
  assert.equal(f.phone, undefined);
  assert.equal(f.message, undefined);
});

test("formats today as YYYY-MM-DD", () => {
  assert.equal(localToday(new Date(2026, 0, 5)), "2026-01-05");
});
