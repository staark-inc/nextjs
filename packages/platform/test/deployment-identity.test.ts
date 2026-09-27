import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FsStorage } from "@staark/core/storage";
import { resolveDeploymentIdentity } from "../src/deployment/identity.ts";

test("deployment id survives repeated resolves on persistent storage", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "staark-deployment-"));
  try {
    const storage = new FsStorage(dir);
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      STAARK_THEME: "webb",
      STAARK_STORAGE: "fs",
      STAARK_CONTENT_SOURCE: "fixtures",
    };

    const first = await resolveDeploymentIdentity({
      env,
      storage,
      now: () => new Date("2026-09-27T10:00:00.000Z"),
      createId: () => "dep-test-001",
    });
    const second = await resolveDeploymentIdentity({
      env,
      storage,
      now: () => new Date("2027-01-01T00:00:00.000Z"),
      createId: () => "dep-should-not-be-used",
    });

    assert.equal(first.deploymentId, "dep-test-001");
    assert.equal(second.deploymentId, "dep-test-001");
    assert.equal(second.installedAt, "2026-09-27T10:00:00.000Z");
    assert.equal(second.theme, "webb");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("explicit deployment identity is persisted with a stable install time", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "staark-deployment-"));
  try {
    const deployment = await resolveDeploymentIdentity({
      storage: new FsStorage(dir),
      env: {
        NODE_ENV: "test",
        STAARK_DEPLOYMENT_ID: "prod-client-01",
        STAARK_INSTALLED_AT: "2026-09-27T10:00:00.000Z",
        STAARK_SITE_ID: "site-123",
        STAARK_SITE_SECRET: "secret",
        STAARK_THEME: "webb",
        STAARK_STORAGE: "fs",
        STAARK_UPDATE_CHANNEL: "preview",
        STAARK_RELEASE_VERSION: "0.8.0",
        STAARK_RELEASE_ID: "git-abcdef",
      },
    });

    assert.equal(deployment.deploymentId, "prod-client-01");
    assert.equal(deployment.siteId, "site-123");
    assert.equal(deployment.contentSource, "hub");
    assert.equal(deployment.channel, "preview");
    assert.equal(deployment.platformVersion, "0.8.0");
    assert.equal(deployment.releaseId, "git-abcdef");

    const second = await resolveDeploymentIdentity({
      storage: new FsStorage(dir),
      env: {
        NODE_ENV: "test",
        STAARK_DEPLOYMENT_ID: "prod-client-01",
        STAARK_SITE_ID: "site-123",
        STAARK_SITE_SECRET: "secret",
        STAARK_THEME: "webb",
        STAARK_STORAGE: "fs",
        STAARK_UPDATE_CHANNEL: "preview",
        STAARK_RELEASE_VERSION: "0.8.0",
        STAARK_RELEASE_ID: "git-abcdef",
      },
      now: () => new Date("2027-01-01T00:00:00.000Z"),
    });
    assert.equal(second.installedAt, "2026-09-27T10:00:00.000Z");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("unknown update channels are rejected", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "staark-deployment-"));
  try {
    await assert.rejects(
      () =>
        resolveDeploymentIdentity({
          storage: new FsStorage(dir),
          env: {
            NODE_ENV: "test",
            STAARK_DEPLOYMENT_ID: "prod-client-01",
            STAARK_UPDATE_CHANNEL: "whatever",
          },
        }),
      /Invalid option|stable|preview|canary/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
