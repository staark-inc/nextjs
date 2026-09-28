import test from "node:test";
import assert from "node:assert/strict";
import {
  WEBSITE_PROFILE_OPTIONS,
  normalizeWebsiteType,
  resolveWebsiteProfile,
} from "../lib/website-profile.ts";

test("website profiles normalize unknown values safely", () => {
  assert.equal(normalizeWebsiteType("salon"), "salon");
  assert.equal(normalizeWebsiteType("hotel"), "hotel");
  assert.equal(normalizeWebsiteType("unknown"), "business");
  assert.equal(normalizeWebsiteType(undefined), "business");
});

test("website profile registry exposes every 11A profile", () => {
  assert.deepEqual(
    WEBSITE_PROFILE_OPTIONS.map((profile) => profile.type),
    ["business", "salon", "restaurant", "hotel", "automotive", "portfolio", "custom"],
  );
  assert.equal(resolveWebsiteProfile("automotive").inboxDescription, "Service enquiries");
  assert.equal(resolveWebsiteProfile("portfolio").shortLabel, "Portfolio");
});
