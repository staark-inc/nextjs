import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  getStorage,
  normalizeStoragePath,
  readStorageJson,
  writeStorageJson,
  type StaarkStorage,
  type StorageEntry,
} from "@staark/platform/server";

export const STAARK_STATE_PREFIX = ".staark";
export const STAARK_UPLOADS_PREFIX = "public/uploads";

export type StorageSeedResult = {
  seeded: boolean;
  copied: number;
  contentPrefix: string;
  source?: string;
};

let bootstrapPromise: Promise<StorageSeedResult> | undefined;

function portablePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

/**
 * Logical content prefix inside StaarkStorage.
 *
 * Storage paths are intentionally relative. This matches the existing fixture
 * content client and lets the same keys map to /data on fs or to an S3 prefix.
 */
export function contentStoragePrefix(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = env.STAARK_CONTENT_DIR?.trim() || "content";
  return normalizeStoragePath(portablePath(raw) || "content");
}

export function storagePath(...parts: string[]): string {
  const joined = parts
    .map(portablePath)
    .filter(Boolean)
    .join("/");
  return normalizeStoragePath(joined);
}

export function stateStoragePath(...parts: string[]): string {
  return storagePath(STAARK_STATE_PREFIX, ...parts);
}

export function uploadsStoragePath(...parts: string[]): string {
  return storagePath(STAARK_UPLOADS_PREFIX, ...parts);
}

/**
 * SaaS tenant-owned state.
 *
 * Never use the global .staark namespace for mutable tenant data.
 */
export function tenantStateStoragePath(
  siteId: string,
  ...parts: string[]
): string {
  if (!siteId.trim()) {
    throw new Error("Tenant storage requires siteId.");
  }

  return storagePath(
    "sites",
    siteId,
    STAARK_STATE_PREFIX,
    ...parts,
  );
}

/**
 * SaaS tenant-owned uploaded media.
 *
 * Public URLs intentionally remain /uploads/<name>; the hostname resolves
 * the owning tenant before this storage key is read.
 */
export function tenantUploadsStoragePath(
  siteId: string,
  ...parts: string[]
): string {
  if (!siteId.trim()) {
    throw new Error("Tenant storage requires siteId.");
  }

  return storagePath(
    "sites",
    siteId,
    "uploads",
    ...parts,
  );
}

async function directoryExists(target: string): Promise<boolean> {
  try {
    return (await stat(/* turbopackIgnore: true */ target)).isDirectory();
  } catch {
    return false;
  }
}

async function findPackagedSeedRoot(
  contentPrefix: string,
): Promise<string | null> {
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const nativeRelative = contentPrefix.split("/").join(path.sep);

  // Local dev: cwd is normally apps/starter.
  // Standalone Docker: cwd is /app and starter files live in /app/apps/starter.
  const candidates = [
    path.resolve(/* turbopackIgnore: true */ cwd, nativeRelative),
    path.resolve(/* turbopackIgnore: true */ cwd, "apps", "starter", nativeRelative),
  ];

  for (const candidate of candidates) {
    if (
      await directoryExists(candidate) &&
      await stat(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ candidate, "site.json"))
        .then((entry) => entry.isFile())
        .catch(() => false)
    ) {
      return candidate;
    }
  }

  return null;
}

async function collectSeedFiles(
  root: string,
  relative = "",
  out: Array<{ absolute: string; relative: string }> = [],
): Promise<Array<{ absolute: string; relative: string }>> {
  const dir = relative ? path.join(/* turbopackIgnore: true */ root, relative) : root;
  const entries = await readdir(/* turbopackIgnore: true */ dir, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const nextRelative = relative
      ? path.join(/* turbopackIgnore: true */ relative, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      await collectSeedFiles(root, nextRelative, out);
      continue;
    }

    if (entry.isFile()) {
      out.push({
        absolute: path.join(/* turbopackIgnore: true */ root, nextRelative),
        relative: nextRelative.split(path.sep).join("/"),
      });
    }
  }

  return out;
}

async function bootstrapLocalContent(
  storage: StaarkStorage,
  contentPrefix: string,
): Promise<StorageSeedResult> {
  const siteKey = storagePath(contentPrefix, "site.json");

  if (await storage.exists(siteKey)) {
    return {
      seeded: false,
      copied: 0,
      contentPrefix,
    };
  }

  const source = await findPackagedSeedRoot(contentPrefix);
  if (!source) {
    throw new Error(
      `[staark] Storage content "${siteKey}" is missing and no packaged seed ` +
        `was found for STAARK_CONTENT_DIR="${contentPrefix}".`,
    );
  }

  const files = await collectSeedFiles(source);
  let copied = 0;

  // Never replace data already present in persistent storage. A partially
  // populated first boot is repaired by copying only the missing seed files.
  for (const file of files) {
    const key = storagePath(contentPrefix, file.relative);
    if (await storage.exists(key)) continue;

    await storage.write(key, await readFile(/* turbopackIgnore: true */ file.absolute));
    copied += 1;
  }

  if (!(await storage.exists(siteKey))) {
    throw new Error(
      `[staark] Packaged seed did not create required content "${siteKey}".`,
    );
  }

  if (copied > 0) {
    console.info(
      `[staark] Seeded ${copied} content file${copied === 1 ? "" : "s"} ` +
        `into storage at ${contentPrefix}.`,
    );
  }

  return {
    seeded: copied > 0,
    copied,
    contentPrefix,
    source,
  };
}

/**
 * Ensure fixture content exists in the configured persistent storage.
 *
 * The promise is shared so layout/page/metadata requests cannot race and seed
 * the same empty volume several times. A failed bootstrap is cleared so a
 * later request may retry after configuration/storage is repaired.
 */
export function ensureLocalContentSeed(): Promise<StorageSeedResult> {
  if (!bootstrapPromise) {
    const contentPrefix = contentStoragePrefix();
    bootstrapPromise = bootstrapLocalContent(getStorage(), contentPrefix).catch(
      (error) => {
        bootstrapPromise = undefined;
        throw error;
      },
    );
  }

  return bootstrapPromise;
}


/** Storage key inside the active content root. */
export function contentStoragePath(...parts: string[]): string {
  return storagePath(contentStoragePrefix(), ...parts);
}

/**
 * Content helpers used by the local ACP.
 *
 * They deliberately bootstrap the packaged fixture content before the first
 * read/write so a fresh /data volume or empty S3 prefix behaves like local dev.
 */
export async function readContentJson<T>(
  relativePath: string,
): Promise<T | null> {
  await ensureLocalContentSeed();
  return readStorageJson<T>(getStorage(), contentStoragePath(relativePath));
}

export async function writeContentJson(
  relativePath: string,
  value: unknown,
): Promise<void> {
  await ensureLocalContentSeed();
  await writeStorageJson(getStorage(), contentStoragePath(relativePath), value);
}

export async function listContent(
  relativePrefix: string,
): Promise<StorageEntry[]> {
  await ensureLocalContentSeed();
  return getStorage().list(contentStoragePath(relativePrefix));
}

export async function contentExists(relativePath: string): Promise<boolean> {
  await ensureLocalContentSeed();
  return getStorage().exists(contentStoragePath(relativePath));
}

export async function deleteContent(relativePath: string): Promise<void> {
  await ensureLocalContentSeed();
  await getStorage().delete(contentStoragePath(relativePath));
}


/** Generic persistent admin-state helpers under `.staark/`. */
export async function readStateText(
  relativePath: string,
): Promise<string | null> {
  return getStorage().readText(stateStoragePath(relativePath));
}

export async function writeStateText(
  relativePath: string,
  value: string,
): Promise<void> {
  await getStorage().write(stateStoragePath(relativePath), value);
}

export async function readStateJson<T>(
  relativePath: string,
): Promise<T | null> {
  return readStorageJson<T>(getStorage(), stateStoragePath(relativePath));
}

export async function writeStateJson(
  relativePath: string,
  value: unknown,
): Promise<void> {
  await writeStorageJson(getStorage(), stateStoragePath(relativePath), value);
}

export async function listState(
  relativePrefix: string,
): Promise<StorageEntry[]> {
  return getStorage().list(stateStoragePath(relativePrefix));
}

export async function stateExists(relativePath: string): Promise<boolean> {
  return getStorage().exists(stateStoragePath(relativePath));
}

export async function deleteState(relativePath: string): Promise<void> {
  await getStorage().delete(stateStoragePath(relativePath));
}
