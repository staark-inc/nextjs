import { randomUUID } from "node:crypto";
import {
  DeploymentIdentitySchema,
  DeploymentUpdateChannelSchema,
  STAARK_PLATFORM_VERSION,
  type DeploymentIdentity,
} from "@staark/core";
import {
  getStorage,
  readJson,
  writeJson,
  type StaarkStorage,
} from "@staark/core/storage";

const DEPLOYMENT_STATE_PATH = ".staark/deployment.json";
const DEPLOYMENT_STATE_SCHEMA = "staark-deployment-state/v1";

type StoredDeploymentState = {
  schema: typeof DEPLOYMENT_STATE_SCHEMA;
  deploymentId: string;
  installedAt: string;
};

export type ResolveDeploymentIdentityOptions = {
  env?: NodeJS.ProcessEnv;
  storage?: StaarkStorage;
  now?: () => Date;
  createId?: () => string;
  capabilities?: string[];
};

function contentSource(env: NodeJS.ProcessEnv): "hub" | "fixtures" {
  const explicit = env.STAARK_CONTENT_SOURCE?.trim();
  if (explicit === "hub" || explicit === "fixtures") return explicit;
  return env.STAARK_SITE_ID?.trim() && env.STAARK_SITE_SECRET?.trim()
    ? "hub"
    : "fixtures";
}

function storageDriver(env: NodeJS.ProcessEnv): "fs" | "s3" {
  const driver = (env.STAARK_STORAGE?.trim() || "fs").toLowerCase();
  if (driver !== "fs" && driver !== "s3") {
    throw new Error(
      `Invalid STAARK_STORAGE for deployment identity: ${JSON.stringify(driver)}.`,
    );
  }
  return driver;
}

function parseStoredState(input: unknown): StoredDeploymentState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Persistent deployment identity is invalid.");
  }
  const raw = input as Record<string, unknown>;
  if (
    raw.schema !== DEPLOYMENT_STATE_SCHEMA ||
    typeof raw.deploymentId !== "string" ||
    raw.deploymentId.trim().length < 3 ||
    typeof raw.installedAt !== "string" ||
    Number.isNaN(Date.parse(raw.installedAt))
  ) {
    throw new Error("Persistent deployment identity is invalid.");
  }

  return {
    schema: DEPLOYMENT_STATE_SCHEMA,
    deploymentId: raw.deploymentId.trim(),
    installedAt: raw.installedAt,
  };
}

async function persistentState(
  storage: StaarkStorage,
  options: ResolveDeploymentIdentityOptions,
  preferredId?: string,
  preferredInstalledAt?: string,
): Promise<StoredDeploymentState> {
  const existingRaw = await readJson<unknown>(storage, DEPLOYMENT_STATE_PATH);
  if (existingRaw !== null) {
    const existing = parseStoredState(existingRaw);
    if (preferredId && preferredId !== existing.deploymentId) {
      const updated: StoredDeploymentState = {
        ...existing,
        deploymentId: preferredId,
      };
      parseStoredState(updated);
      await writeJson(storage, DEPLOYMENT_STATE_PATH, updated);
      return updated;
    }
    return existing;
  }

  const now = (options.now ?? (() => new Date()))();
  const deploymentId =
    preferredId ?? (options.createId ?? (() => `dep-${randomUUID()}`))();
  const installedAt = preferredInstalledAt || now.toISOString();
  const state: StoredDeploymentState = {
    schema: DEPLOYMENT_STATE_SCHEMA,
    deploymentId,
    installedAt,
  };
  parseStoredState(state);
  await writeJson(storage, DEPLOYMENT_STATE_PATH, state);
  return state;
}

/**
 * Stable identity for one installed Staark Next deployment.
 *
 * With no explicit STAARK_DEPLOYMENT_ID the id and installedAt timestamp are
 * created once in persistent storage. Rebuilding/replacing the container keeps
 * the same identity as long as the storage volume/bucket remains attached.
 *
 * `.staark/deployment.json` is deliberately not part of Backup/Restore scopes:
 * restoring site content must never clone another deployment's fleet identity.
 */
export async function resolveDeploymentIdentity(
  options: ResolveDeploymentIdentityOptions = {},
): Promise<DeploymentIdentity> {
  const env = options.env ?? process.env;
  const storage = options.storage ?? getStorage(env);
  const explicitId = env.STAARK_DEPLOYMENT_ID?.trim();

  const state = await persistentState(
    storage,
    options,
    explicitId,
    env.STAARK_INSTALLED_AT?.trim(),
  );

  const channel = DeploymentUpdateChannelSchema.parse(
    env.STAARK_UPDATE_CHANNEL?.trim() || "stable",
  );

  return DeploymentIdentitySchema.parse({
    schema: "staark-deployment/v1",
    deploymentId: state.deploymentId,
    siteId: env.STAARK_SITE_ID?.trim() || "local-dev",
    platform: "staark-next",
    platformVersion:
      env.STAARK_RELEASE_VERSION?.trim() || STAARK_PLATFORM_VERSION,
    releaseId: env.STAARK_RELEASE_ID?.trim() || "local",
    channel,
    theme: env.STAARK_THEME?.trim() || "salong",
    contentSource: contentSource(env),
    storage: storageDriver(env),
    installedAt: state.installedAt,
    capabilities: options.capabilities ?? [
      "deployment.identity.v1",
      "updates.check.v1",
    ],
  });
}
