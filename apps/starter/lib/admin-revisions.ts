import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const REVISION_SCHEMA = "staark-page-revision/v1" as const;
const MAX_REVISIONS_PER_PAGE = 50;

type PageRevision = {
  schema: typeof REVISION_SCHEMA;
  version: 1;
  id: string;
  file: string;
  createdAt: string;
  reason: string;
  sha256: string;
  page: Record<string, unknown>;
};

export type PageRevisionSummary = Pick<
  PageRevision,
  "id" | "file" | "createdAt" | "reason" | "sha256"
> & {
  title: string;
  path: string;
  blocks: number;
};

function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

function safeFile(file: string): string {
  if (!file || path.basename(file) !== file || !file.endsWith(".json")) {
    throw new Error("Invalid page file.");
  }
  return file;
}

function safeId(id: string): string {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid revision id.");
  return id;
}

function revisionDir(file: string): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".staark",
    "revisions",
    "pages",
    safeFile(file).replace(/[^a-zA-Z0-9._-]/g, "_"),
  );
}

function revisionPath(file: string, id: string): string {
  return path.join(revisionDir(file), `${safeId(id)}.json`);
}

function pagePath(file: string): string {
  return path.join(contentRoot(), "pages", safeFile(file));
}

function hashPage(page: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(page)).digest("hex");
}

function createId(): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
  return `${stamp}-${randomBytes(3).toString("hex")}`;
}

function parseRevision(input: unknown): PageRevision {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid page revision.");
  }
  const raw = input as Record<string, unknown>;
  if (raw.schema !== REVISION_SCHEMA || raw.version !== 1) {
    throw new Error("Unsupported page revision.");
  }
  return raw as PageRevision;
}

function summary(revision: PageRevision): PageRevisionSummary {
  const blocks = Array.isArray(revision.page.blocks) ? revision.page.blocks.length : 0;
  return {
    id: revision.id,
    file: revision.file,
    createdAt: revision.createdAt,
    reason: revision.reason,
    sha256: revision.sha256,
    title: typeof revision.page.title === "string" ? revision.page.title : revision.file,
    path: typeof revision.page.path === "string" ? revision.page.path : "",
    blocks,
  };
}

export async function createPageRevision(
  file: string,
  page: Record<string, unknown>,
  reason: string,
): Promise<PageRevisionSummary> {
  const dir = revisionDir(file);
  await mkdir(dir, { recursive: true });

  const revision: PageRevision = {
    schema: REVISION_SCHEMA,
    version: 1,
    id: createId(),
    file: safeFile(file),
    createdAt: new Date().toISOString(),
    reason: reason.trim().slice(0, 80) || "save",
    sha256: hashPage(page),
    page,
  };

  const existing = await listPageRevisions(file);
  const latest = existing[0];
  if (latest && latest.sha256 === revision.sha256) {
    return latest;
  }

  await writeFile(
    revisionPath(file, revision.id),
    JSON.stringify(revision, null, 2) + "\n",
    "utf8",
  );

  const after = await listPageRevisions(file);
  for (const stale of after.slice(MAX_REVISIONS_PER_PAGE)) {
    await rm(revisionPath(file, stale.id), { force: true });
  }

  return summary(revision);
}

export async function listPageRevisions(file: string): Promise<PageRevisionSummary[]> {
  const dir = revisionDir(file);
  await mkdir(dir, { recursive: true });
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();

  const revisions: PageRevisionSummary[] = [];
  for (const name of names) {
    try {
      const revision = parseRevision(JSON.parse(await readFile(path.join(dir, name), "utf8")));
      revisions.push(summary(revision));
    } catch {
      // Skip malformed historical entries.
    }
  }
  return revisions;
}

export async function readPageRevision(file: string, id: string): Promise<PageRevision> {
  return parseRevision(JSON.parse(await readFile(revisionPath(file, id), "utf8")));
}

export async function restorePageRevision(
  file: string,
  id: string,
): Promise<Record<string, unknown>> {
  const target = await readPageRevision(file, id);
  const current = JSON.parse(await readFile(pagePath(file), "utf8")) as Record<string, unknown>;
  await createPageRevision(file, current, "before-restore");

  const restored = {
    ...target.page,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(pagePath(file), JSON.stringify(restored, null, 2) + "\n", "utf8");
  return restored;
}
