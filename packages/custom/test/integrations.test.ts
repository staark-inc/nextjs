import assert from "node:assert/strict";
import test from "node:test";
import { parseCustomRuntimeConfig } from "../src/config.ts";
import { createCustomApiIntegrations } from "../src/integrations.ts";

const config = () => parseCustomRuntimeConfig({ theme: { family: "light" }, integrations: [
  { key: "crm", baseUrl: "https://api.example.com/v1/", tokenEnv: "CRM_TOKEN" },
] });
test("integration sends server credentials with timeout and disallows redirect following", async () => {
  let called = false;
  const clients = createCustomApiIntegrations(config(), { CRM_TOKEN: "private-token" }, async (url, init) => {
    called = true;
    assert.equal(String(url), "https://api.example.com/v1/leads");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer private-token");
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    return new Response("{}", { status: 200 });
  });
  await clients.get("crm")!.request("leads");
  assert.equal(called, true);
});
test("integration blocks origin and base-path escape before sending credentials", async () => {
  let calls = 0;
  const clients = createCustomApiIntegrations(config(), { CRM_TOKEN: "secret" }, async () => { calls++; return new Response(); });
  for (const path of ["https://evil.example/x", "//evil.example/x", "../private", "/outside"]) {
    await assert.rejects(clients.get("crm")!.request(path), /configured base URL/);
  }
  assert.equal(calls, 0);
});
test("missing credentials and upstream errors fail without exposing response bodies", async () => {
  const missing = createCustomApiIntegrations(config(), {});
  await assert.rejects(missing.get("crm")!.request("leads"), /Missing credential/);
  const failing = createCustomApiIntegrations(config(), { CRM_TOKEN: "secret" }, async () => new Response("sensitive body", { status: 503 }));
  await assert.rejects(failing.get("crm")!.request("leads"), /^Error: API integration "crm" returned HTTP 503\.$/);
});
