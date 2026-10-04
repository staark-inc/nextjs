import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePublicFormPolicy,
} from "../lib/public-form-policy.ts";

test(
  "basic contact intake is available on an active site",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {},
        registeredKinds: [
          "contact",
        ],
        endpointKinds: [
          "contact",
          "lead",
        ],
        requestedKind:
          "contact",
      }),
      {
        ok: true,
      },
    );
  },
);

test(
  "suspended site cannot issue or accept forms",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: false,
        entitlements: {
          bookingEnabled: true,
        },
        registeredKinds: [
          "booking",
        ],
        endpointKinds: [
          "booking",
        ],
        requestedKind:
          "booking",
      }),
      {
        ok: false,
        code:
          "SITE_UNAVAILABLE",
      },
    );
  },
);

test(
  "unknown form id fails closed",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          bookingEnabled: true,
        },
        registeredKinds: [],
        endpointKinds: [
          "booking",
        ],
        requestedKind:
          "booking",
      }),
      {
        ok: false,
        code:
          "FORM_NOT_FOUND",
      },
    );
  },
);

test(
  "booking cannot be posted through generic forms endpoint",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          bookingEnabled: true,
        },
        registeredKinds: [
          "booking",
        ],
        endpointKinds: [
          "contact",
          "lead",
        ],
        requestedKind:
          "booking",
      }),
      {
        ok: false,
        code:
          "FORM_NOT_FOUND",
      },
    );
  },
);

test(
  "booking requires booking entitlement",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          bookingEnabled: false,
        },
        registeredKinds: [
          "booking",
        ],
        endpointKinds: [
          "booking",
        ],
        requestedKind:
          "booking",
      }),
      {
        ok: false,
        code:
          "FORM_FEATURE_REQUIRED",
      },
    );
  },
);

test(
  "booking works when configured and entitled",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          bookingEnabled: true,
        },
        registeredKinds: [
          "booking",
        ],
        endpointKinds: [
          "booking",
        ],
        requestedKind:
          "booking",
      }),
      {
        ok: true,
      },
    );
  },
);

test(
  "lead requires leads entitlement",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          leadsEnabled: false,
        },
        registeredKinds: [
          "lead",
        ],
        endpointKinds: [
          "contact",
          "lead",
        ],
        requestedKind:
          "lead",
      }),
      {
        ok: false,
        code:
          "FORM_FEATURE_REQUIRED",
      },
    );
  },
);

test(
  "token is issued only when a configured endpoint kind is commercially allowed",
  () => {
    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          leadsEnabled: true,
        },
        registeredKinds: [
          "lead",
        ],
        endpointKinds: [
          "contact",
          "lead",
        ],
      }),
      {
        ok: true,
      },
    );

    assert.deepEqual(
      evaluatePublicFormPolicy({
        publicAccess: true,
        entitlements: {
          leadsEnabled: false,
        },
        registeredKinds: [
          "lead",
        ],
        endpointKinds: [
          "contact",
          "lead",
        ],
      }),
      {
        ok: false,
        code:
          "FORM_FEATURE_REQUIRED",
      },
    );
  },
);
