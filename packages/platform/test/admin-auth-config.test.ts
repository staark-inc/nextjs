import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAdminAuthConfig,
  StaarkConfigurationError,
} from "../src/admin/auth-config.ts";

test("development keeps explicit convenience defaults", () => {
  assert.deepEqual(resolveAdminAuthConfig({ NODE_ENV: "development" }), {
    username: "admin",
    password: "admin",
    sessionSecret: "staark-dev-secret-at-least-32-chars-long!!",
  });
});

test("production refuses to start admin auth with missing secrets", () => {
  assert.throws(
    () => resolveAdminAuthConfig({ NODE_ENV: "production" }),
    (error: unknown) =>
      error instanceof StaarkConfigurationError &&
      error.message.includes("ADMIN_USERNAME") &&
      error.message.includes("ADMIN_PASSWORD") &&
      error.message.includes("ADMIN_SESSION_SECRET"),
  );
});

test("production accepts explicit credentials and a strong session secret", () => {
  const config = resolveAdminAuthConfig({
    NODE_ENV: "production",
    ADMIN_USERNAME: "owner",
    ADMIN_PASSWORD: "a-real-password",
    ADMIN_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  });

  assert.equal(config.username, "owner");
  assert.equal(config.password, "a-real-password");
  assert.equal(config.sessionSecret, "0123456789abcdef0123456789abcdef");
});

test("short session secrets are rejected in every environment", () => {
  assert.throws(
    () => resolveAdminAuthConfig({ NODE_ENV: "development", ADMIN_SESSION_SECRET: "too-short" }),
    /at least 32 characters/,
  );
});
