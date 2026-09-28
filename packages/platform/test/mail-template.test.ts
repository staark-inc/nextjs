import assert from "node:assert/strict";
import test from "node:test";
import {
  renderEmailTemplate,
  renderSubmissionNotification,
} from "../src/mail/index.ts";

test("shared email template renders text and escapes html", () => {
  const rendered = renderEmailTemplate({
    siteName: "Staark Test",
    eyebrow: "Inbox",
    title: "New message",
    rows: [{ label: "Name", value: "<script>alert(1)</script>" }],
    message: "Hello & welcome",
    action: { label: "Open inbox", href: "https://example.com/admin/forms" },
  });

  assert.match(rendered.text, /New message/);
  assert.match(rendered.text, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(rendered.html, /<script>alert\(1\)<\/script>/);
  assert.match(rendered.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(rendered.html, /https:\/\/example\.com\/admin\/forms/);
});

test("contact notification uses reply-to and enquiry subject", () => {
  const rendered = renderSubmissionNotification({
    kind: "contact",
    formId: "contact-main",
    fields: {
      name: "Ada",
      email: "ada@example.com",
      message: "Can you call me?",
    },
    siteName: "Example AB",
    to: "owner@example.com",
    pageUrl: "https://example.com/contact",
    receivedAt: "2026-09-28T12:00:00.000Z",
  });

  assert.equal(rendered.subject, "New enquiry - Example AB");
  assert.equal(rendered.replyTo, "ada@example.com");
  assert.match(rendered.text, /Source page: https:\/\/example\.com\/contact/);
  assert.match(rendered.text, /Can you call me\?/);
});

test("booking notification exposes booking context through the same template", () => {
  const rendered = renderSubmissionNotification({
    kind: "booking",
    formId: "booking-main",
    fields: {
      name: "Costin",
      email: "costin@example.com",
      booking_date: "2026-10-01",
      booking_time: "15:30",
      booking_item: "Consultation",
    },
    siteName: "Example AB",
    to: "owner@example.com",
  });

  assert.equal(rendered.subject, "New booking request - Example AB");
  assert.match(rendered.text, /Date: 2026-10-01/);
  assert.match(rendered.text, /Time: 15:30/);
  assert.match(rendered.text, /Service: Consultation/);
});
