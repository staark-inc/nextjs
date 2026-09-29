import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, formatCount, weekdayIndex } from "../src/platform.ts";

test("detects platforms from links", () => {
  assert.equal(detectPlatform("https://www.youtube.com/@someone"), "youtube");
  assert.equal(detectPlatform("https://youtu.be/abc"), "youtube");
  assert.equal(detectPlatform("https://kick.com/someone"), "kick");
  assert.equal(detectPlatform("https://twitter.com/someone"), "x");
  assert.equal(detectPlatform("https://discord.gg/abc"), "discord");
  assert.equal(detectPlatform("ts3server://ts.example.com"), "teamspeak");
  assert.equal(detectPlatform("mailto:hi@example.com"), "email");
  assert.equal(detectPlatform("/setup"), "link");
  assert.equal(detectPlatform("https://example.com"), "link");
});

test("explicit platform wins, unknown explicit is ignored", () => {
  assert.equal(detectPlatform("https://example.com", "shop"), "shop");
  assert.equal(detectPlatform("https://kick.com/x", "nope"), "kick");
});

test("weekday index is Monday-based and timezone-aware", () => {
  // 2026-09-28 is a Monday. 23:30 UTC is already Tuesday in Bucharest (UTC+3).
  const d = new Date(Date.UTC(2026, 8, 28, 23, 30));
  assert.equal(weekdayIndex(d, "UTC"), 0);
  assert.equal(weekdayIndex(d, "Europe/Bucharest"), 1);
  assert.equal(weekdayIndex(new Date(Date.UTC(2026, 9, 4, 12)), "UTC"), 6);
});

test("formats follower counts", () => {
  assert.equal(formatCount(950), "950");
  assert.equal(formatCount(1234), "1,2k");
  assert.equal(formatCount(184000), "184k");
  assert.equal(formatCount(2_500_000), "2,5M");
  assert.equal(formatCount(-1), "");
});
