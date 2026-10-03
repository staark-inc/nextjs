import assert from "node:assert/strict";
import test from "node:test";

import {
  canUsePlanFeature,
  getPlanFeatureAccess,
  getPlanFeatureLevel,
  resolvePlanFeatureAccess,
} from "../lib/feature-access.ts";

const STARTER = {
  bookingEnabled: false,
  analytics: "overview",
  searchConsole: "overview",
  businessProfile: false,
  leadsEnabled: false,
  reports: "basic",
  automations: "none",
  crmEnabled: false,
  clientManagementEnabled: false,
  teamEnabled: false,
};

const GROWTH = {
  bookingEnabled: true,
  analytics: "full",
  searchConsole: "full",
  businessProfile: true,
  leadsEnabled: true,
  reports: "full",
  automations: "standard",
  crmEnabled: false,
  clientManagementEnabled: false,
  teamEnabled: false,
};

const BUSINESS = {
  bookingEnabled: true,
  analytics: "advanced",
  searchConsole: "full",
  businessProfile: true,
  leadsEnabled: true,
  reports: "advanced",
  automations: "advanced",
  crmEnabled: true,
  clientManagementEnabled: true,
  teamEnabled: true,
};

test("Starter exposes overview/basic capabilities only", () => {
  assert.equal(canUsePlanFeature(STARTER, "booking"), false);
  assert.equal(canUsePlanFeature(STARTER, "analytics"), true);
  assert.equal(getPlanFeatureLevel(STARTER, "analytics"), "overview");
  assert.equal(getPlanFeatureLevel(STARTER, "searchConsole"), "overview");
  assert.equal(getPlanFeatureLevel(STARTER, "reports"), "basic");
  assert.equal(canUsePlanFeature(STARTER, "automations"), false);
  assert.equal(canUsePlanFeature(STARTER, "crm"), false);
  assert.equal(canUsePlanFeature(STARTER, "team"), false);
});

test("Growth enables growth capabilities without Business-only CRM/team", () => {
  assert.equal(canUsePlanFeature(GROWTH, "booking"), true);
  assert.equal(getPlanFeatureLevel(GROWTH, "analytics"), "full");
  assert.equal(getPlanFeatureLevel(GROWTH, "searchConsole"), "full");
  assert.equal(canUsePlanFeature(GROWTH, "businessProfile"), true);
  assert.equal(canUsePlanFeature(GROWTH, "leads"), true);
  assert.equal(getPlanFeatureLevel(GROWTH, "reports"), "full");
  assert.equal(getPlanFeatureLevel(GROWTH, "automations"), "standard");
  assert.equal(canUsePlanFeature(GROWTH, "crm"), false);
  assert.equal(canUsePlanFeature(GROWTH, "clientManagement"), false);
  assert.equal(canUsePlanFeature(GROWTH, "team"), false);
});

test("Business enables advanced and operations capabilities", () => {
  assert.equal(canUsePlanFeature(BUSINESS, "booking"), true);
  assert.equal(getPlanFeatureLevel(BUSINESS, "analytics"), "advanced");
  assert.equal(getPlanFeatureLevel(BUSINESS, "reports"), "advanced");
  assert.equal(getPlanFeatureLevel(BUSINESS, "automations"), "advanced");
  assert.equal(canUsePlanFeature(BUSINESS, "crm"), true);
  assert.equal(canUsePlanFeature(BUSINESS, "clientManagement"), true);
  assert.equal(canUsePlanFeature(BUSINESS, "team"), true);
});

test("missing and explicitly disabled entitlements fail closed", () => {
  assert.equal(canUsePlanFeature({}, "analytics"), false);
  assert.equal(canUsePlanFeature({ analytics: "none" }, "analytics"), false);
  assert.equal(canUsePlanFeature({ crmEnabled: false }, "crm"), false);
  assert.equal(getPlanFeatureLevel({}, "reports"), null);
});

test("registry resolves every commercial feature consistently", () => {
  const result = resolvePlanFeatureAccess(BUSINESS);

  assert.equal(result.analytics.enabled, true);
  assert.equal(result.analytics.level, "advanced");
  assert.equal(result.crm.enabled, true);
  assert.equal(result.team.enabled, true);
});
