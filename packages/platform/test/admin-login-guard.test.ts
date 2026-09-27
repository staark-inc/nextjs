import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_SESSION_TTL_SECONDS,
  adminCredentialsMatch,
  clientAddress,
  createLoginRateLimiter,
  isAdminSessionActive,
  safeAdminNext,
  secureEqual,
} from "../src/admin/login-guard.ts";

const HOUR = 60 * 60 * 1000;

test("session is active only when logged in and within the TTL", () => {
  const now = 1_000_000_000_000;
  assert.equal(isAdminSessionActive({ isLoggedIn: true, loginAt: now - HOUR }, now), true);
  assert.equal(isAdminSessionActive({ isLoggedIn: true, loginAt: now - ADMIN_SESSION_TTL_SECONDS * 1000 }, now), false);
  assert.equal(isAdminSessionActive({ isLoggedIn: true }, now), false);
  assert.equal(isAdminSessionActive({ isLoggedIn: false, loginAt: now }, now), false);
  assert.equal(isAdminSessionActive({ isLoggedIn: true, loginAt: now + HOUR }, now), false);
  assert.equal(isAdminSessionActive(null, now), false);
});

test("safeAdminNext keeps admin paths and rejects everything else", () => {
  assert.equal(safeAdminNext("/admin/media"), "/admin/media");
  assert.equal(safeAdminNext("/admin/pages/home.json?tab=seo"), "/admin/pages/home.json?tab=seo");
  assert.equal(safeAdminNext("/admin"), "/admin");
  for (const bad of [
    null,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "/admin/login",
    "/admin/login?next=/admin",
    "/administrator",
    "/",
    "/admin/../api/staark/forms",
    "admin/media",
  ]) {
    assert.equal(safeAdminNext(bad), "/admin", `expected fallback for ${String(bad)}`);
  }
});

test("secureEqual and adminCredentialsMatch compare exact values", () => {
  assert.equal(secureEqual("hunter2", "hunter2"), true);
  assert.equal(secureEqual("hunter2", "hunter3"), false);
  assert.equal(secureEqual("short", "a much longer value"), false);
  const expected = { username: "owner", password: "correct horse" };
  assert.equal(adminCredentialsMatch(expected, { username: "owner", password: "correct horse" }), true);
  assert.equal(adminCredentialsMatch(expected, { username: "owner", password: "wrong" }), false);
  assert.equal(adminCredentialsMatch(expected, { username: "admin", password: "correct horse" }), false);
});

test("rate limiter locks after max attempts and unlocks after lock time", () => {
  const limiter = createLoginRateLimiter({ maxAttempts: 3, windowMs: 60_000, lockMs: 120_000 });
  const t = 1_000_000;
  assert.deepEqual(limiter.check("ip", t), { allowed: true, remaining: 3 });
  assert.deepEqual(limiter.recordFailure("ip", t), { allowed: true, remaining: 2 });
  assert.deepEqual(limiter.recordFailure("ip", t + 1), { allowed: true, remaining: 1 });
  assert.deepEqual(limiter.recordFailure("ip", t + 2), { allowed: false, retryAfterSeconds: 120 });
  assert.equal(limiter.check("ip", t + 60_000).allowed, false);
  // A failure while locked does not reset or extend the lock.
  assert.deepEqual(limiter.recordFailure("ip", t + 60_002), { allowed: false, retryAfterSeconds: 60 });
  assert.deepEqual(limiter.check("ip", t + 120_002), { allowed: true, remaining: 3 });
  // Other clients are unaffected.
  assert.deepEqual(limiter.check("other", t + 2), { allowed: true, remaining: 3 });
});

test("rate limiter forgets failures after the window and on reset", () => {
  const limiter = createLoginRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
  limiter.recordFailure("ip", 0);
  limiter.recordFailure("ip", 1);
  assert.deepEqual(limiter.check("ip", 60_001), { allowed: true, remaining: 3 });
  limiter.recordFailure("ip", 70_000);
  limiter.reset("ip");
  assert.deepEqual(limiter.check("ip", 70_001), { allowed: true, remaining: 3 });
});

test("clientAddress prefers the first forwarded address", () => {
  assert.equal(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientAddress(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientAddress(new Headers()), "unknown");
});
