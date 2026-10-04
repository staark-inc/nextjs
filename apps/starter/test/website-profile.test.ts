import test from "node:test";
import assert from "node:assert/strict";
import {
  WEBSITE_PROFILE_OPTIONS,
  normalizeWebsiteType,
  resolveClientFeatures,
  resolveWebsiteProfile,
  supportsServicesCatalog,
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


test("website profile features stay vertical and entitlement-aware", () => {
  const salon =
    resolveClientFeatures(
      "salon",
      [],
    );

  // Services are vertical functionality.
  assert.equal(
    salon.includes("services"),
    true,
  );

  // Booking is commercial functionality and must never
  // be granted only because the tenant is a salon.
  assert.equal(
    salon.includes("booking"),
    false,
  );

  const salonWithBooking =
    resolveClientFeatures(
      "salon",
      ["booking"],
    );

  assert.equal(
    salonWithBooking.includes("booking"),
    true,
  );

  assert.equal(
    salonWithBooking.includes("services"),
    true,
  );

  const business =
    resolveClientFeatures(
      "business",
      [],
    );

  assert.equal(
    business.includes("booking"),
    false,
  );

  assert.equal(
    business.includes("services"),
    false,
  );

  const businessWithBooking =
    resolveClientFeatures(
      "business",
      ["booking"],
    );

  assert.equal(
    businessWithBooking.includes("booking"),
    true,
  );

  const businessWithCommercialFeatures =
    resolveClientFeatures(
      "business",
      [
        "inbox",
        "seo",
        "analytics",
        "domains",
      ],
    );

  assert.equal(
    businessWithCommercialFeatures.includes("inbox"),
    true,
  );

  assert.equal(
    businessWithCommercialFeatures.includes("seo"),
    true,
  );

  assert.equal(
    businessWithCommercialFeatures.includes("analytics"),
    true,
  );

  assert.equal(
    businessWithCommercialFeatures.includes("domains"),
    true,
  );

  assert.equal(
    supportsServicesCatalog("salon"),
    true,
  );

  assert.equal(
    supportsServicesCatalog("business"),
    false,
  );

  assert.equal(
    supportsServicesCatalog("automotive"),
    false,
  );
});
