import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const BACKUP_SCHEMA = "staark-backup/v1" as const;
const BACKUPS_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  ".staark",
  "backups",
);

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

function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir)
    ? dir
    : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

function backupPath(id: string): string {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid backup id.");
  return path.join(BACKUPS_DIR, `${id}.json`);
}

function createId(): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${stamp}-${randomBytes(3).toString("hex")}`;
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
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

function targetForRelative(value: string): string {
  const relative = safeRelative(value);
  if (relative === "content") return contentRoot();
  if (relative.startsWith("content/")) {
    return path.join(contentRoot(), relative.slice("content/".length));
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), relative);
}

async function collectFiles(
  absolute: string,
  relative: string,
  out: BackupFile[],
): Promise<void> {
  if (!(await exists(absolute))) return;
  const info = await stat(absolute);

  if (info.isDirectory()) {
    const entries = await readdir(absolute);
    for (const entry of entries.sort()) {
      await collectFiles(
        path.join(absolute, entry),
        path.posix.join(relative.replaceAll("\\", "/"), entry),
        out,
      );
    }
    return;
  }

  if (!info.isFile()) return;
  const data = await readFile(absolute);
  out.push({
    path: safeRelative(relative),
    size: data.byteLength,
    contentBase64: data.toString("base64"),
  });
}

function sources(includeUploads: boolean): Array<{ scope: string; absolute: string }> {
  const app = /* turbopackIgnore: true */ process.cwd();
  const managed = [
    { scope: "content", absolute: contentRoot() },
    { scope: ".staark/themes", absolute: path.join(app, ".staark", "themes") },
    { scope: ".staark/media.json", absolute: path.join(app, ".staark", "media.json") },
    { scope: ".staark/inbox-state.json", absolute: path.join(app, ".staark", "inbox-state.json") },
    { scope: ".staark/submissions.jsonl", absolute: path.join(app, ".staark", "submissions.jsonl") },
    { scope: ".staark/revisions", absolute: path.join(app, ".staark", "revisions") },
    { scope: ".staark/redirects.json", absolute: path.join(app, ".staark", "redirects.json") },
  ];

  if (includeUploads) {
    managed.push({
      scope: "public/uploads",
      absolute: path.join(app, "public", "uploads"),
    });
  }

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
  await mkdir(BACKUPS_DIR, { recursive: true });
  const target = backupPath(pkg.id);
  const temporary = `${target}.${process.pid}.tmp`;

  try {
    await writeFile(temporary, JSON.stringify(pkg) + "\n", "utf8");
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function createBackup(
  label = "Manual backup",
  includeUploads = true,
): Promise<BackupSummary> {
  const files: BackupFile[] = [];
  const managed = sources(includeUploads);

  for (const source of managed) {
    await collectFiles(source.absolute, source.scope, files);
  }

  const pkg: BackupPackage = {
    schema: BACKUP_SCHEMA,
    version: 1,
    id: createId(),
    label: label.trim().slice(0, 120) || "Manual backup",
    createdAt: new Date().toISOString(),
    includeUploads,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    scopes: managed.map((source) => source.scope),
    files,
  };

  await writePackage(pkg);
  return summary(pkg);
}

export async function listBackups(): Promise<BackupSummary[]> {
  await mkdir(BACKUPS_DIR, { recursive: true });
  const entries = (await readdir(BACKUPS_DIR))
    .filter((name) => /^[a-z0-9-]+\.json$/i.test(name))
    .sort()
    .reverse();

  const backups: BackupSummary[] = [];
  for (const entry of entries) {
    try {
      const pkg = parsePackage(
        JSON.parse(await readFile(path.join(BACKUPS_DIR, entry), "utf8")),
      );
      backups.push(summary(pkg));
    } catch {
      // One malformed snapshot must not make the recovery screen unusable.
    }
  }

  return backups;
}

export async function readBackup(id: string): Promise<BackupPackage> {
  const pkg = parsePackage(JSON.parse(await readFile(backupPath(id), "utf8")));
  if (pkg.id !== id) throw new Error("Backup id does not match its filename.");
  return pkg;
}

export async function deleteBackup(id: string): Promise<void> {
  await rm(backupPath(id), { force: false });
}

async function clearScope(scope: string): Promise<void> {
  const target = targetForRelative(scope);
  await rm(target, { recursive: true, force: true });

  if (path.extname(scope) === "") {
    await mkdir(target, { recursive: true });
  }
}

async function writeBackupFile(file: BackupFile, scopes: string[]): Promise<void> {
  const relative = safeRelative(file.path);
  if (!scopes.some((scope) => belongsToScope(relative, scope))) {
    throw new Error(`Backup file is outside managed scopes: ${relative}`);
  }

  const target = targetForRelative(relative);
  const data = Buffer.from(file.contentBase64, "base64");
  if (data.byteLength !== file.size) {
    throw new Error(`Backup file size mismatch: ${relative}`);
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function restoreBackup(id: string): Promise<{
  restored: BackupSummary;
  safetyBackup: BackupSummary;
}> {
  // readBackup fully validates every scope/file before we create or delete anything.
  const pkg = await readBackup(id);

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
