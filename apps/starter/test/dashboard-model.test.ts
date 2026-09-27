import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyCounts,
  describeInboxActivity,
  latestActivity,
  relativeTime,
  seoIssues,
  seoScore,
  sortTasks,
  weekOverWeek,
  type DashboardTask,
  type SeoPage,
} from "../lib/dashboard-model.ts";

const page = (overrides: Partial<SeoPage>): SeoPage => ({
  file: "home.json",
  path: "/",
  title: "Home",
  seoTitle: "Home | Studio",
  seoDescription: "A description that is comfortably longer than fifty characters.",
  noindex: false,
  ...overrides,
});

test("seoIssues and seoScore", () => {
  assert.deepEqual(seoIssues(page({})), []);
  assert.equal(seoScore(page({})), 100);
  assert.deepEqual(seoIssues(page({ seoTitle: " " })), ["missing title"]);
  assert.equal(seoScore(page({ seoTitle: "" })), 50);
  assert.deepEqual(seoIssues(page({ seoDescription: "Too short" })), ["description too short"]);
  assert.equal(seoScore(page({ seoDescription: "Too short" })), 80);
  assert.equal(seoScore(page({ seoTitle: "", seoDescription: "" })), 0);
  assert.deepEqual(seoIssues(page({ seoTitle: "", noindex: true })), []);
});

test("dailyCounts buckets by UTC day, oldest first", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");
  const counts = dailyCounts(
    ["2026-09-27T01:00:00Z", "2026-09-27T23:59:00Z", "2026-09-26T10:00:00Z", "2026-09-14T10:00:00Z", "2026-09-13T10:00:00Z", "nope"],
    14,
    now,
  );
  assert.equal(counts.length, 14);
  assert.equal(counts[13], 2);
  assert.equal(counts[12], 1);
  assert.equal(counts[0], 1);
  assert.equal(counts.reduce((a, b) => a + b, 0), 4);
});

test("weekOverWeek compares the last 7 buckets with the 7 before", () => {
  const counts = [1, 0, 0, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 3];
  assert.deepEqual(weekOverWeek(counts), { current: 6, previous: 2, delta: 4 });
});

test("relativeTime", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");
  assert.equal(relativeTime("2026-09-27T11:59:30Z", now), "Just now");
  assert.equal(relativeTime("2026-09-27T11:15:00Z", now), "45 min ago");
  assert.equal(relativeTime("2026-09-27T09:00:00Z", now), "3 h ago");
  assert.equal(relativeTime("2026-09-26T08:00:00Z", now), "Yesterday");
  assert.equal(relativeTime("2026-09-23T08:00:00Z", now), "4 days ago");
  assert.equal(relativeTime("2026-09-01T08:00:00Z", now), "1 Sept");
  assert.equal(relativeTime("bad", now), "");
});

test("sortTasks puts bookings first and keeps order within a kind", () => {
  const t = (id: string, kind: DashboardTask["kind"], order = 0): DashboardTask => ({ id, kind, tone: "lead", title: id, detail: "", href: "/", order });
  const sorted = sortTasks([t("seo", "seo"), t("msg2", "message", 2), t("design", "design"), t("msg1", "message", 1), t("book", "booking"), t("err", "health")]);
  assert.deepEqual(sorted.map((x) => x.id), ["book", "err", "msg1", "msg2", "seo", "design"]);
});

test("latestActivity sorts newest first, drops bad dates and limits", () => {
  const events = [
    { id: "a", at: "2026-09-20T10:00:00Z", kind: "page" as const, text: "a" },
    { id: "b", at: "2026-09-27T10:00:00Z", kind: "backup" as const, text: "b" },
    { id: "c", at: "not a date", kind: "media" as const, text: "c" },
    { id: "d", at: "2026-09-25T10:00:00Z", kind: "enquiry" as const, text: "d" },
  ];
  assert.deepEqual(latestActivity(events, 2).map((e) => e.id), ["b", "d"]);
});

test("describeInboxActivity writes readable feed lines", () => {
  assert.equal(describeInboxActivity("Emma", "Booking: pending → confirmed", true), "Booking from Emma confirmed");
  assert.equal(describeInboxActivity("Emma", "Booking: confirmed → pending", true), "Booking from Emma moved back to pending");
  assert.equal(describeInboxActivity("Emma", "Status: new → read", true), null);
  assert.equal(describeInboxActivity("Sara", "Status: new → read", false), "Message from Sara marked as read");
  assert.equal(describeInboxActivity("Sara", "Status: read → new", false), "Message from Sara marked as unread");
  assert.equal(describeInboxActivity("Sara", "Called back, sending quote", false), "Sara: Called back, sending quote");
});
