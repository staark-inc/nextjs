import assert from "node:assert/strict";
import test from "node:test";
import { staarkSecurityHeaders } from "../src/next/security.ts";

function headerMap() {
  return new Map(staarkSecurityHeaders().map((header) => [header.key, header.value]));
}

function setNodeEnv(value: string | undefined) {
  if (value === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", value);
}

test("development security headers do not force HTTPS", () => {
  const previous = process.env.NODE_ENV;
  setNodeEnv("development");
  try {
    const headers = headerMap();
    assert.equal(headers.has("Strict-Transport-Security"), false);
    assert.equal(headers.get("Content-Security-Policy")?.includes("upgrade-insecure-requests"), false);
  } finally {
    setNodeEnv(previous);
  }
});

test("production security headers enable HTTPS hardening", () => {
  const previous = process.env.NODE_ENV;
  setNodeEnv("production");
  try {
    const headers = headerMap();
    assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000; includeSubDomains");
    assert.equal(headers.get("Content-Security-Policy")?.includes("upgrade-insecure-requests"), true);
  } finally {
    setNodeEnv(previous);
  }
});
