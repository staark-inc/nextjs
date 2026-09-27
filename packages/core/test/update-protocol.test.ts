import test from "node:test";
import assert from "node:assert/strict";
import {
  UpdateCheckRequestSchema,
  UpdateCheckResponseSchema,
  UpdateManifestSchema,
} from "../src/update/protocol.ts";

const deployment = {
  schema: "staark-deployment/v1",
  deploymentId: "dep-test-001",
  siteId: "site-001",
  platform: "staark-next",
  platformVersion: "0.8.0",
  releaseId: "git-abc123",
  channel: "stable",
  theme: "webb",
  contentSource: "hub",
  storage: "fs",
  installedAt: "2026-09-27T10:00:00.000Z",
  capabilities: ["deployment.identity.v1", "updates.check.v1"],
} as const;

test("update-check request accepts a valid deployment identity", () => {
  const parsed = UpdateCheckRequestSchema.parse({
    schema: "staark-update-check-request/v1",
    deployment,
  });
  assert.equal(parsed.deployment.deploymentId, "dep-test-001");
});

test("available update requires a valid docker artifact", () => {
  const parsed = UpdateCheckResponseSchema.parse({
    schema: "staark-update-check/v1",
    status: "available",
    checkedAt: "2026-09-27T10:05:00.000Z",
    update: {
      schema: "staark-update/v1",
      updateId: "update-080",
      version: "0.8.1",
      channel: "stable",
      publishedAt: "2026-09-27T10:04:00.000Z",
      title: "Staark Next 0.8.1",
      artifact: {
        kind: "docker-image",
        reference: "ghcr.io/staark-inc/nextjs:0.8.1",
        digest: `sha256:${"a".repeat(64)}`,
      },
      requiresBackup: true,
    },
  });

  assert.equal(parsed.status, "available");
  if (parsed.status === "available") {
    assert.equal(parsed.update.version, "0.8.1");
    assert.equal(parsed.update.artifact.kind, "docker-image");
  }
});

test("invalid image digests are rejected", () => {
  assert.throws(() =>
    UpdateManifestSchema.parse({
      schema: "staark-update/v1",
      updateId: "bad-update",
      version: "0.8.1",
      channel: "stable",
      publishedAt: "2026-09-27T10:04:00.000Z",
      title: "Bad digest",
      artifact: {
        kind: "docker-image",
        reference: "ghcr.io/staark-inc/nextjs:0.8.1",
        digest: "sha256:not-a-real-digest",
      },
      requiresBackup: true,
    }),
  );
});

test("blocked update-check responses carry a reason", () => {
  const parsed = UpdateCheckResponseSchema.parse({
    schema: "staark-update-check/v1",
    status: "blocked",
    checkedAt: "2026-09-27T10:05:00.000Z",
    reason: "Deployment requires a manual migration.",
  });

  assert.equal(parsed.status, "blocked");
});
