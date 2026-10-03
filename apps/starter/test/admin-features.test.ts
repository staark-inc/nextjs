import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAdminFeature,
  featureForAdminPath,
  resolveAccessibleAdminFeatures,
  resolveAdminEntitlements,
} from "../lib/admin-features.ts";

test("client gets core features, not manager features", () => {
  const features = resolveAccessibleAdminFeatures("client", {});
  assert.equal(features.includes("dashboard"), true);
  assert.equal(features.includes("pages"), true);
  assert.equal(features.includes("design"), true);
  assert.equal(features.includes("seo"), true);
  assert.equal(features.includes("themes"), false);
  assert.equal(features.includes("redirects"), true);
  assert.equal(features.includes("health"), false);
  assert.equal(features.includes("backups"), false);
});

test("manager gets all registered features", () => {
  const features = resolveAccessibleAdminFeatures("manager", {});
  assert.equal(features.includes("themes"), true);
  assert.equal(features.includes("redirects"), true);
  assert.equal(features.includes("health"), true);
  assert.equal(features.includes("backups"), true);
  assert.equal(features.includes("system"), true);
});

test("booking is entitlement-driven for clients", () => {
  assert.deepEqual(resolveAdminEntitlements({ STAARK_ENTITLEMENTS: "booking" }), ["booking"]);
  assert.equal(canAccessAdminFeature("client", "booking", []), false);
  assert.equal(canAccessAdminFeature("client", "booking", ["booking"]), true);
});

test("design, technical and unknown admin routes are classified correctly", () => {
  assert.equal(featureForAdminPath("/admin/themes"), "design");
  assert.equal(featureForAdminPath("/api/admin/themes/config"), "design");

  assert.equal(featureForAdminPath("/admin/themes/studio"), "themes");
  assert.equal(featureForAdminPath("/api/admin/themes"), "themes");
  assert.equal(featureForAdminPath("/api/admin/themes/activate"), "themes");

  assert.equal(featureForAdminPath("/api/admin/backups/create"), "backups");
  assert.equal(featureForAdminPath("/admin/future-tool"), "system");
  assert.equal(featureForAdminPath("/api/admin/future-tool"), "system");
});


test("analytics is plan entitlement driven for clients", () => {
  assert.equal(
    canAccessAdminFeature(
      "client",
      "analytics",
      [],
    ),
    false,
  );

  assert.equal(
    canAccessAdminFeature(
      "client",
      "analytics",
      ["analytics"],
    ),
    true,
  );

  assert.equal(
    featureForAdminPath(
      "/admin/analytics",
    ),
    "analytics",
  );
});


test("privacy settings are a core client feature", () => {
  const features =
    resolveAccessibleAdminFeatures(
      "client",
      {},
    );

  assert.equal(
    features.includes("privacy"),
    true,
  );

  assert.equal(
    featureForAdminPath(
      "/admin/privacy",
    ),
    "privacy",
  );

  assert.equal(
    featureForAdminPath(
      "/api/admin/privacy",
    ),
    "privacy",
  );
});
