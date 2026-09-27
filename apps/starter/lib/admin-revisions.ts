import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import {
  deleteState,
  listState,
  readContentJson,
  readStateJson,
  stateStoragePath,
  writeContentJson,
  writeStateJson,
} from "./storage";

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

function safeFile(file: string): string {
  if (!file || path.posix.basename(file) !== file || !file.endsWith(".json")) {
    throw new Error("Invalid page file.");
  }
  return file;
}

function safeId(id: string): string {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid revision id.");
  return id;
}

function revisionPrefix(file: string): string {
  return `revisions/pages/${safeFile(file).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function revisionPath(file: string, id: string): string {
  return `${revisionPrefix(file)}/${safeId(id)}.json`;
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

  await writeStateJson(revisionPath(file, revision.id), revision);

  const after = await listPageRevisions(file);
  for (const stale of after.slice(MAX_REVISIONS_PER_PAGE)) {
    await deleteState(revisionPath(file, stale.id));
  }

  return summary(revision);
}

export async function listPageRevisions(
  file: string,
  options: { limit?: number } = {},
): Promise<PageRevisionSummary[]> {
  const relativePrefix = revisionPrefix(file);
  const absolutePrefix = `${stateStoragePath(relativePrefix)}/`;
  const names = (await listState(relativePrefix))
    .map((entry) =>
      entry.path.startsWith(absolutePrefix)
        ? entry.path.slice(absolutePrefix.length)
        : "",
    )
    .filter((name) => Boolean(name) && !name.includes("/") && name.endsWith(".json"))
    .sort()
    .reverse()
    // Newest first; only read as many revision files as the caller needs.
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);

  const revisions: PageRevisionSummary[] = [];
  for (const name of names) {
    try {
      const revision = await readStateJson<PageRevision>(`${relativePrefix}/${name}`);
      if (!revision) continue;
      revisions.push(summary(parseRevision(revision)));
    } catch {
      // Skip malformed historical entries.
    }
  }
  return revisions;
}

export async function readPageRevision(file: string, id: string): Promise<PageRevision> {
  const revision = await readStateJson<PageRevision>(revisionPath(file, id));
  if (!revision) throw new Error("Revision not found.");
  return parseRevision(revision);
}

export async function restorePageRevision(
  file: string,
  id: string,
): Promise<Record<string, unknown>> {
  const target = await readPageRevision(file, id);
  const current = await readContentJson<Record<string, unknown>>(`pages/${safeFile(file)}`);
  if (!current) throw new Error("Page not found.");
  await createPageRevision(file, current, "before-restore");

  const restored = {
    ...target.page,
    updatedAt: new Date().toISOString(),
  };
  await writeContentJson(`pages/${safeFile(file)}`, restored);
  return restored;
}
