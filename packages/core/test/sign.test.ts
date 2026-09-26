import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, signaturePayload, verifySignature, issueFormToken, checkFormToken } from "../src/hub/sign.ts";

const SECRET = "site-secret-abc";
const SITE = "site_123";

test("signature payload matches the WordPress connector layout", () => {
  const p = signaturePayload("get", "/api/hub/next/site", "1700000000", "");
  assert.equal(p.split("\n").length, 4);
  assert.equal(p.split("\n")[0], "GET");
  // sha256 of empty string is well-known.
  assert.equal(p.split("\n")[3], "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("verifySignature accepts a request signed with the same secret", () => {
  const method = "POST";
  const path = "/api/staark/revalidate";
  const body = JSON.stringify({ tags: ["staark:pages"] });
  const ts = "1700000000";
  const headers = new Headers({
    "x-staark-site-id": SITE,
    "x-staark-timestamp": ts,
    "x-staark-signature": sign(method, path, ts, body, SECRET),
  });
  const result = verifySignature({ method, path, body, headers, siteId: SITE, secret: SECRET, now: 1_700_000_000_000 });
  assert.deepEqual(result, { ok: true });
});

test("verifySignature rejects a wrong secret and an expired timestamp", () => {
  const headers = (ts: string, secret: string) =>
    new Headers({ "x-staark-site-id": SITE, "x-staark-timestamp": ts, "x-staark-signature": sign("GET", "/p", ts, "", secret) });
  const base = { method: "GET", path: "/p", body: "", siteId: SITE, secret: SECRET, now: 1_700_000_000_000 };

  assert.equal(verifySignature({ ...base, headers: headers("1700000000", "wrong") }).ok, false);
  assert.equal(verifySignature({ ...base, headers: headers("1600000000", SECRET) }).ok, false);
});

test("form token round-trips and blocks fast/late submissions", () => {
  const now = 1_700_000_000_000;
  const token = issueFormToken("staark-home", SECRET, now);
  assert.equal(checkFormToken(token, "staark-home", SECRET, { now: now + 5000 }).ok, true);
  assert.deepEqual(checkFormToken(token, "staark-home", SECRET, { now: now + 500 }), { ok: false, reason: "too_fast" });
  assert.deepEqual(checkFormToken(token, "other", SECRET, { now: now + 5000 }), { ok: false, reason: "signature" });
});
