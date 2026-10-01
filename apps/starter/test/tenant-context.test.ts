import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHostname,
  resolveRequestHostname,
} from "../lib/tenant-host.ts";

test("normalizeHostname lowercases and strips a port", () => {
  assert.equal(normalizeHostname("Demo.Staark.App:443"), "demo.staark.app");
});

test("normalizeHostname uses the first forwarded host", () => {
  assert.equal(
    normalizeHostname("client.staark.app, proxy.internal"),
    "client.staark.app",
  );
});

test("normalizeHostname strips a trailing dot", () => {
  assert.equal(normalizeHostname("client.staark.app."), "client.staark.app");
});

test("resolveRequestHostname ignores forwarded host unless proxy trust is enabled", () => {
  assert.equal(
    resolveRequestHostname(
      {
        host: "direct.internal:3200",
        forwardedHost: "client.staark.app",
      },
      { STAARK_TRUST_PROXY: "0" },
    ),
    "direct.internal",
  );
});

test("resolveRequestHostname trusts forwarded host when STAARK_TRUST_PROXY=1", () => {
  assert.equal(
    resolveRequestHostname(
      {
        host: "traefik",
        forwardedHost: "client.staark.app",
      },
      { STAARK_TRUST_PROXY: "1" },
    ),
    "client.staark.app",
  );
});
