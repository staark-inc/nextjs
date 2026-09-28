import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAdminAccounts,
  resolveAdminLoginAccount,
  resolveAdminRole,
} from "../src/admin/roles.ts";

const base = {
  username: "legacy-admin",
  password: "legacy-password",
  sessionSecret: "12345678901234567890123456789012",
};

test("legacy admin remains the manager account", () => {
  const accounts = resolveAdminAccounts(base, { NODE_ENV: "production" });
  assert.deepEqual(accounts, [
    {
      username: "legacy-admin",
      password: "legacy-password",
      role: "manager",
    },
  ]);
});

test("client and manager credentials resolve to different roles", () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    ADMIN_CLIENT_USERNAME: "customer",
    ADMIN_CLIENT_PASSWORD: "customer-secret",
    ADMIN_MANAGER_USERNAME: "staark",
    ADMIN_MANAGER_PASSWORD: "manager-secret",
  };

  const client = resolveAdminLoginAccount(
    base,
    { username: "customer", password: "customer-secret" },
    env,
  );
  const manager = resolveAdminLoginAccount(
    base,
    { username: "staark", password: "manager-secret" },
    env,
  );

  assert.equal(client?.role, "client");
  assert.equal(manager?.role, "manager");
});

test("development receives a client convenience account", () => {
  const accounts = resolveAdminAccounts(base, { NODE_ENV: "development" });
  assert.equal(
    accounts.some((account) => account.username === "client" && account.role === "client"),
    true,
  );
});

test("pre-role sessions preserve previous full-admin access", () => {
  assert.equal(resolveAdminRole(undefined), "manager");
  assert.equal(resolveAdminRole("client"), "client");
  assert.equal(resolveAdminRole("manager"), "manager");
});
