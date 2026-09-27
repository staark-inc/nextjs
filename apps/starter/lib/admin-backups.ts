import path from "node:path";
import { randomBytes } from "node:crypto";
import { getStorage } from "@staark/platform/server";
import { ensureMediaSeed } from "./admin-media";
import {
  contentStoragePrefix,
  ensureLocalContentSeed,
  stateStoragePath,
  storagePath,
} from "./storage";

const BACKUP_SCHEMA = "staark-backup/v1" as const;
const BACKUP_PREFIX = stateStoragePath("backups");

const ALLOWED_SCOPES = new Set([
  "content",
  ".staark/themes",
  ".staark/media.json",
  ".staark/inbox-state.json",
  ".staark/submissions.jsonl",
  ".staark/revisions",
  ".staark/redirects.json",
  "public/uploads",
]);

type BackupFile = {
  path: string;
  size: number;
  contentBase64: string;
};

type BackupPackage = {
  schema: typeof BACKUP_SCHEMA;
  version: 1;
  id: string;
  label: string;
  createdAt: string;
  includeUploads: boolean;
  totalBytes: number;
  scopes: string[];
  files: BackupFile[];
};

export type BackupSummary = Pick<
  BackupPackage,
  "id" | "label" | "createdAt" | "includeUploads" | "totalBytes"
> & {
  fileCount: number;
  includesRevisions: boolean;
  includesRedirects: boolean;
};

function backupStoragePath(id: string): string {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid backup id.");
  return stateStoragePath("backups", `${id}.json`);
}

function createId(): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${stamp}-${randomBytes(3).toString("hex")}`;
}

function usesFixtureContent(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicit = env.STAARK_CONTENT_SOURCE?.trim();
  if (explicit === "fixtures") return true;
  if (explicit === "hub") return false;
  return !(env.STAARK_SITE_ID?.trim() && env.STAARK_SITE_SECRET?.trim());
}

function safeRelative(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0")
  ) {
    throw new Error("Backup contains an unsafe path.");
  }

  const clean = path.posix.normalize(normalized);
  if (
    clean === ".." ||
    clean.startsWith("../") ||
    clean !== normalized
  ) {
    throw new Error("Backup contains an unsafe path.");
  }
  return clean;
}

function allowedScope(value: string): string {
  const scope = safeRelative(value);
  if (!ALLOWED_SCOPES.has(scope)) {
    throw new Error(`Backup contains unsupported scope: ${scope}`);
  }
  return scope;
}

function belongsToScope(relative: string, scope: string): boolean {
  return relative === scope || relative.startsWith(`${scope}/`);
}

/**
 * Backup packages keep portable logical paths such as `content/pages/home.json`.
 * Runtime storage may place that content at another prefix (for example
 * `content/webb`), so translate only at the storage boundary.
 */
function storagePathForRelative(value: string): string {
  const relative = safeRelative(value);
  if (relative === "content") return contentStoragePrefix();
  if (relative.startsWith("content/")) {
    return storagePath(
      contentStoragePrefix(),
      relative.slice("content/".length),
    );
  }
  return storagePath(relative);
}

function logicalPathForStorage(
  storageObjectPath: string,
  scope: string,
  storagePrefix: string,
): string {
  if (storageObjectPath === storagePrefix) return scope;
  if (!storageObjectPath.startsWith(`${storagePrefix}/`)) {
    throw new Error(`Storage returned an object outside ${scope}.`);
  }
  return safeRelative(
    `${scope}/${storageObjectPath.slice(storagePrefix.length + 1)}`,
  );
}

async function collectScope(scope: string, out: BackupFile[]): Promise<void> {
  const storage = getStorage();
  const storagePrefix = storagePathForRelative(scope);

  const exact = await storage.stat(storagePrefix);
  if (exact) {
    const data = await storage.read(storagePrefix);
    if (data === null) return;
    out.push({
      path: scope,
      size: data.byteLength,
      contentBase64: Buffer.from(data).toString("base64"),
    });
    return;
  }

  const entries = (await storage.list(storagePrefix))
    .filter(
      (entry) =>
        entry.path === storagePrefix ||
        entry.path.startsWith(`${storagePrefix}/`),
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of entries) {
    const data = await storage.read(entry.path);
    if (data === null) continue;
    out.push({
      path: logicalPathForStorage(entry.path, scope, storagePrefix),
      size: data.byteLength,
      contentBase64: Buffer.from(data).toString("base64"),
    });
  }
}

function sources(includeUploads: boolean): string[] {
  const managed = [
    "content",
    ".staark/themes",
    ".staark/media.json",
    ".staark/inbox-state.json",
    ".staark/submissions.jsonl",
    ".staark/revisions",
    ".staark/redirects.json",
  ];

  if (includeUploads) managed.push("public/uploads");
  return managed;
}

function parseBackupFile(value: unknown): BackupFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Backup contains an invalid file entry.");
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.path !== "string") throw new Error("Backup file path is invalid.");
  if (typeof raw.size !== "number" || !Number.isInteger(raw.size) || raw.size < 0) {
    throw new Error("Backup file size is invalid.");
  }
  if (typeof raw.contentBase64 !== "string") {
    throw new Error("Backup file content is invalid.");
  }

  const relative = safeRelative(raw.path);
  const content = Buffer.from(raw.contentBase64, "base64");
  const size = Number(raw.size);
  if (content.byteLength !== size) {
    throw new Error(`Backup file size mismatch: ${relative}`);
  }

  return {
    path: relative,
    size,
    contentBase64: raw.contentBase64,
  };
}

function parsePackage(input: unknown): BackupPackage {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid backup package.");
  }

  const raw = input as Record<string, unknown>;
  if (raw.schema !== BACKUP_SCHEMA || raw.version !== 1) {
    throw new Error("Unsupported backup format.");
  }
  if (typeof raw.id !== "string" || !/^[a-z0-9-]+$/i.test(raw.id)) {
    throw new Error("Invalid backup id.");
  }
  if (typeof raw.label !== "string" || !raw.label.trim()) {
    throw new Error("Invalid backup label.");
  }
  if (typeof raw.createdAt !== "string" || Number.isNaN(Date.parse(raw.createdAt))) {
    throw new Error("Invalid backup creation date.");
  }
  if (typeof raw.includeUploads !== "boolean") {
    throw new Error("Invalid backup upload flag.");
  }
  if (!Array.isArray(raw.scopes) || !Array.isArray(raw.files)) {
    throw new Error("Backup package is incomplete.");
  }

  const scopes = raw.scopes.map((scope) => {
    if (typeof scope !== "string") throw new Error("Backup scope is invalid.");
    return allowedScope(scope);
  });

  if (new Set(scopes).size !== scopes.length) {
    throw new Error("Backup contains duplicate scopes.");
  }

  const files = raw.files.map(parseBackupFile);
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path)) throw new Error(`Backup contains duplicate file: ${file.path}`);
    seen.add(file.path);

    if (!scopes.some((scope) => belongsToScope(file.path, scope))) {
      throw new Error(`Backup file is outside managed scopes: ${file.path}`);
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    schema: BACKUP_SCHEMA,
    version: 1,
    id: raw.id,
    label: raw.label.trim().slice(0, 120),
    createdAt: raw.createdAt,
    includeUploads: raw.includeUploads,
    totalBytes,
    scopes,
    files,
  };
}

function summary(pkg: BackupPackage): BackupSummary {
  return {
    id: pkg.id,
    label: pkg.label,
    createdAt: pkg.createdAt,
    includeUploads: pkg.includeUploads,
    totalBytes: pkg.totalBytes,
    fileCount: pkg.files.length,
    includesRevisions: pkg.scopes.includes(".staark/revisions"),
    includesRedirects: pkg.scopes.includes(".staark/redirects.json"),
  };
}

async function writePackage(pkg: BackupPackage): Promise<void> {
  await getStorage().write(
    backupStoragePath(pkg.id),
    JSON.stringify(pkg) + "\n",
  );
}

export async function createBackup(
  label = "Manual backup",
  includeUploads = true,
): Promise<BackupSummary> {
  // A backup must snapshot the runtime source of truth. Fixture deployments
  // materialize their packaged seed first; Hub deployments must not invent
  // local content just because a recovery point was requested.
  if (usesFixtureContent()) await ensureLocalContentSeed();
  if (includeUploads) await ensureMediaSeed();

  const files: BackupFile[] = [];
  const managed = sources(includeUploads);

  for (const scope of managed) {
    await collectScope(scope, files);
  }

  const pkg: BackupPackage = {
    schema: BACKUP_SCHEMA,
    version: 1,
    id: createId(),
    label: label.trim().slice(0, 120) || "Manual backup",
    createdAt: new Date().toISOString(),
    includeUploads,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    scopes: managed,
    files,
  };

  await writePackage(pkg);
  return summary(pkg);
}

export async function listBackups(): Promise<BackupSummary[]> {
  const storage = getStorage();
  const prefix = `${BACKUP_PREFIX}/`;
  const entries = (await storage.list(BACKUP_PREFIX))
    .filter(
      (entry) =>
        entry.path.startsWith(prefix) &&
        !entry.path.slice(prefix.length).includes("/") &&
        /^[a-z0-9-]+\.json$/i.test(entry.path.slice(prefix.length)),
    )
    .sort((a, b) => b.path.localeCompare(a.path));

  const backups: BackupSummary[] = [];
  for (const entry of entries) {
    try {
      const raw = await storage.readText(entry.path);
      if (raw === null) continue;
      const pkg = parsePackage(JSON.parse(raw));
      backups.push(summary(pkg));
    } catch {
      // One malformed snapshot must not make the recovery screen unusable.
    }
  }

  return backups;
}

/**
 * Backup ids and times without reading the packages, which can be large.
 * Ids start with the UTC creation stamp (YYYYMMDDHHMMSS). Newest first.
 */
export async function listBackupTimes(limit = 5): Promise<Array<{ id: string; createdAt: string }>> {
  const prefix = `${BACKUP_PREFIX}/`;
  const entries = (await getStorage().list(BACKUP_PREFIX))
    .map((entry) => ({ entry, name: entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "" }))
    .filter(({ name }) => /^[a-z0-9-]+\.json$/i.test(name))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, limit);

  return entries.map(({ entry, name }) => {
    const id = name.replace(/\.json$/i, "");
    const stamp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(id);
    const createdAt = stamp
      ? `${stamp[1]}-${stamp[2]}-${stamp[3]}T${stamp[4]}:${stamp[5]}:${stamp[6]}Z`
      : entry.mtime > 0
        ? new Date(entry.mtime).toISOString()
        : "";
    return { id, createdAt };
  });
}

export async function readBackup(id: string): Promise<BackupPackage> {
  const raw = await getStorage().readText(backupStoragePath(id));
  if (raw === null) throw new Error("Backup not found.");

  const pkg = parsePackage(JSON.parse(raw));
  if (pkg.id !== id) throw new Error("Backup id does not match its filename.");
  return pkg;
}

export async function deleteBackup(id: string): Promise<void> {
  const target = backupStoragePath(id);
  const storage = getStorage();
  if (!(await storage.exists(target))) throw new Error("Backup not found.");
  await storage.delete(target);
}

async function clearScope(scope: string): Promise<void> {
  const storage = getStorage();
  const storagePrefix = storagePathForRelative(scope);

  if (await storage.exists(storagePrefix)) {
    await storage.delete(storagePrefix);
  }

  const entries = (await storage.list(storagePrefix))
    .filter(
      (entry) =>
        entry.path === storagePrefix ||
        entry.path.startsWith(`${storagePrefix}/`),
    )
    .sort((a, b) => b.path.length - a.path.length);

  for (const entry of entries) {
    await storage.delete(entry.path);
  }
}

async function writeBackupFile(file: BackupFile, scopes: string[]): Promise<void> {
  const relative = safeRelative(file.path);
  if (!scopes.some((scope) => belongsToScope(relative, scope))) {
    throw new Error(`Backup file is outside managed scopes: ${relative}`);
  }

  const data = Buffer.from(file.contentBase64, "base64");
  if (data.byteLength !== file.size) {
    throw new Error(`Backup file size mismatch: ${relative}`);
  }

  await getStorage().write(storagePathForRelative(relative), data);
}

export async function restoreBackup(id: string): Promise<{
  restored: BackupSummary;
  safetyBackup: BackupSummary;
}> {
  // readBackup fully validates every scope/file before we create or delete anything.
  const pkg = await readBackup(id);

  // The safety point is stored through the same driver but under .staark/backups,
  // which is deliberately outside every restore scope.
  const safetyBackup = await createBackup(
    `Safety backup before restoring ${pkg.label}`,
    true,
  );

  const scopes = pkg.scopes.map(allowedScope);
  for (const scope of scopes) {
    await clearScope(scope);
  }
  for (const file of pkg.files) {
    await writeBackupFile(file, scopes);
  }

  return {
    restored: summary(pkg),
    safetyBackup,
  };
}

export function backupDownloadName(pkg: BackupPackage): string {
  const safeLabel = pkg.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${safeLabel || "staark-backup"}-${pkg.id}.staark-backup.json`;
}
