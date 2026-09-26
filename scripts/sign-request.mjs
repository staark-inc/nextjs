#!/usr/bin/env node
// Sign an arbitrary request the way @staark/core and the WordPress connector do,
// so you can curl the Hub or a site by hand.
//
//   node scripts/sign-request.mjs <secret> <method> <path> [bodyFile]
//
// Prints the X-Staark-* headers and a ready-to-run curl command.
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const [secret, method = "GET", path = "/api/hub/next/site", bodyFile] = process.argv.slice(2);
if (!secret) {
  console.error("usage: node scripts/sign-request.mjs <secret> <method> <path> [bodyFile]");
  process.exit(1);
}

const body = bodyFile ? readFileSync(bodyFile, "utf8") : "";
const ts = String(Math.floor(Date.now() / 1000));
const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
const payload = [method.toUpperCase(), path, ts, bodyHash].join("\n");
const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");

console.log("X-Staark-Timestamp:", ts);
console.log("X-Staark-Signature:", sig);
console.log(
  `\ncurl -s -X ${method.toUpperCase()} \\\n  -H 'X-Staark-Site-ID: <site-id>' \\\n  -H 'X-Staark-Timestamp: ${ts}' \\\n  -H 'X-Staark-Signature: ${sig}' \\\n  -H 'Content-Type: application/json' \\\n  ${body ? `--data @${bodyFile} \\\n  ` : ""}'<base-url>${path}'`,
);
