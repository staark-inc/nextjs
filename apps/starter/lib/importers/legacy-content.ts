import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  normalizePath,
  PageSchema,
  SiteSettingsSchema,
  type Page,
  type SiteSettings,
} from "@staark/core";

import type { PageRecord } from "../repositories/page-repository";
import type { RepositorySet } from "../repositories/repository-set";

const LEGACY_REVISION_SCHEMA = "staark-page-revision/v1";

export type LegacyPageSource = {
  file: string;
  page: Page;
};

export type LegacyRevisionSource = {
  sourceId: string;
  file: string;
  createdAt: string;
  reason: string;
  checksum: string;
  page: Page;
};

export type LegacyContentBundle = {
  sourceRoot: string;
  contentRoot: string;
  stateRoot: string;
  site: SiteSettings;
  pages: LegacyPageSource[];
  revisions: LegacyRevisionSource[];
  orphanRevisions: LegacyRevisionSource[];
};

export type ImportEntityAction =
  | "create"
  | "update"
  | "reactivate"
  | "unchanged";

export type PageImportPlanItem = {
  file: string;
  path: string;
  action: ImportEntityAction;
  pageId: string | null;
};

export type RevisionImportPlanItem = {
  sourceId: string;
  file: string;
  pagePath: string;
  createdAt: string;
  checksum: string;
  action: "create" | "unchanged";
};

export type LegacyImportPlan = {
  siteKey: string;
  site: {
    action: "create" | "update" | "unchanged";
    siteId: string | null;
  };
  pages: PageImportPlanItem[];
  revisions: RevisionImportPlanItem[];
  untouchedDatabasePages: Array<{ id: string; path: string; deletedAt: string | null }>;
  blockingIssues: string[];
  summary: {
    pagesCreate: number;
    pagesUpdate: number;
    pagesReactivate: number;
    pagesUnchanged: number;
    revisionsCreate: number;
    revisionsUnchanged: number;
  };
};

export type LegacyImportWriteResult = {
  plan: LegacyImportPlan;
  siteId: string;
  pagesWritten: number;
  revisionsWritten: number;
};

export type LoadLegacyContentOptions = {
  includeRevisions?: boolean;
};

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function readJson(target: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(target, "utf8");
  } catch (error) {
    throw new Error(`Unable to read legacy JSON ${target}: ${String(error)}`);
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in ${target}: ${String(error)}`);
  }
}

function normalizeSiteKey(value: string): string {
  const key = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-_]{0,99}$/.test(key)) {
    throw new Error(
      "Site key must be 1-100 lowercase letters, numbers, dashes or underscores.",
    );
  }
  return key;
}

function normalizePage(page: Page): Page {
  return PageSchema.parse({
    ...page,
    path: normalizePath(page.path),
  });
}

function assertUniqueBlockIds(file: string, page: Page): void {
  const seen = new Set<string>();
  for (const block of page.blocks) {
    if (seen.has(block.id)) {
      throw new Error(`Duplicate block id "${block.id}" in ${file}.`);
    }
    seen.add(block.id);
  }
}

async function resolveLegacyRoots(source: string): Promise<{
  sourceRoot: string;
  contentRoot: string;
  stateRoot: string;
}> {
  const sourceRoot = path.resolve(source);
  const directSite = path.join(sourceRoot, "site.json");
  const nestedSite = path.join(sourceRoot, "content", "site.json");

  if (await isFile(nestedSite)) {
    return {
      sourceRoot,
      contentRoot: path.join(sourceRoot, "content"),
      stateRoot: path.join(sourceRoot, ".staark"),
    };
  }

  if (await isFile(directSite)) {
    const looksLikeContentRoot = path.basename(sourceRoot) === "content";
    return {
      sourceRoot,
      contentRoot: sourceRoot,
      stateRoot: path.join(looksLikeContentRoot ? path.dirname(sourceRoot) : sourceRoot, ".staark"),
    };
  }

  throw new Error(
    `No legacy site.json found under ${sourceRoot} or ${path.join(sourceRoot, "content")}.`,
  );
}

async function loadPages(contentRoot: string): Promise<LegacyPageSource[]> {
  const pagesRoot = path.join(contentRoot, "pages");
  if (!(await isDirectory(pagesRoot))) {
    throw new Error(`Legacy pages directory not found: ${pagesRoot}`);
  }

  const entries = (await readdir(pagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pages: LegacyPageSource[] = [];
  const paths = new Map<string, string>();

  for (const entry of entries) {
    const target = path.join(pagesRoot, entry.name);
    const page = normalizePage(PageSchema.parse(await readJson(target)));
    assertUniqueBlockIds(entry.name, page);

    const previousFile = paths.get(page.path);
    if (previousFile) {
      throw new Error(
        `Duplicate normalized page path "${page.path}" in ${previousFile} and ${entry.name}.`,
      );
    }
    paths.set(page.path, entry.name);
    pages.push({ file: entry.name, page });
  }

  return pages;
}

function parseLegacyRevision(input: unknown, sourcePath: string): LegacyRevisionSource {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Invalid legacy revision in ${sourcePath}.`);
  }

  const raw = input as Record<string, unknown>;
  if (raw.schema !== LEGACY_REVISION_SCHEMA || raw.version !== 1) {
    throw new Error(`Unsupported legacy revision format in ${sourcePath}.`);
  }
  if (typeof raw.id !== "string" || !raw.id) {
    throw new Error(`Legacy revision is missing id in ${sourcePath}.`);
  }
  if (typeof raw.file !== "string" || !raw.file.endsWith(".json")) {
    throw new Error(`Legacy revision has invalid page file in ${sourcePath}.`);
  }
  if (typeof raw.createdAt !== "string" || Number.isNaN(Date.parse(raw.createdAt))) {
    throw new Error(`Legacy revision has invalid createdAt in ${sourcePath}.`);
  }
  if (typeof raw.reason !== "string") {
    throw new Error(`Legacy revision has invalid reason in ${sourcePath}.`);
  }
  if (typeof raw.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(raw.sha256)) {
    throw new Error(`Legacy revision has invalid sha256 in ${sourcePath}.`);
  }

  return {
    sourceId: raw.id,
    file: raw.file,
    createdAt: new Date(raw.createdAt).toISOString(),
    reason: raw.reason,
    checksum: raw.sha256.toLowerCase(),
    page: normalizePage(PageSchema.parse(raw.page)),
  };
}

async function loadRevisions(
  stateRoot: string,
): Promise<LegacyRevisionSource[]> {
  const revisionsRoot = path.join(stateRoot, "revisions", "pages");
  if (!(await isDirectory(revisionsRoot))) return [];

  const pageDirs = (await readdir(revisionsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const revisions: LegacyRevisionSource[] = [];
  for (const pageDir of pageDirs) {
    const pageRoot = path.join(revisionsRoot, pageDir.name);
    const entries = (await readdir(pageRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const target = path.join(pageRoot, entry.name);
      const revision = parseLegacyRevision(await readJson(target), target);
      if (revision.file !== pageDir.name) {
        throw new Error(
          `Legacy revision ${target} belongs to ${revision.file}, not directory ${pageDir.name}.`,
        );
      }
      revisions.push(revision);
    }
  }

  return revisions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function loadLegacyContent(
  source: string,
  options: LoadLegacyContentOptions = {},
): Promise<LegacyContentBundle> {
  const roots = await resolveLegacyRoots(source);
  const site = SiteSettingsSchema.parse(
    await readJson(path.join(roots.contentRoot, "site.json")),
  );
  const pages = await loadPages(roots.contentRoot);
  const revisions = options.includeRevisions === false
    ? []
    : await loadRevisions(roots.stateRoot);
  const pageFiles = new Set(pages.map((page) => page.file));
  const orphanRevisions = revisions.filter((revision) => !pageFiles.has(revision.file));

  return {
    ...roots,
    site,
    pages,
    revisions,
    orphanRevisions,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => [key, stableValue(record[key])] as const),
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function comparablePage(page: Page): Omit<Page, "updatedAt"> {
  const { updatedAt: _updatedAt, ...content } = page;
  return content;
}

function pagesEqual(left: Page, right: Page): boolean {
  return stableJson(comparablePage(left)) === stableJson(comparablePage(right));
}

function siteSettingsEqual(left: SiteSettings, right: SiteSettings): boolean {
  return stableJson(left) === stableJson(right);
}

function pageAction(source: Page, existing: PageRecord | undefined): ImportEntityAction {
  if (!existing) return "create";
  if (existing.deletedAt) return "reactivate";
  return pagesEqual(source, existing.page) ? "unchanged" : "update";
}

export async function planLegacyContentImport(
  bundle: LegacyContentBundle,
  siteKeyInput: string,
  repositories: RepositorySet,
): Promise<LegacyImportPlan> {
  const siteKey = normalizeSiteKey(siteKeyInput);
  const existingSite = await repositories.sites.findByKey(siteKey);
  const siteAction = !existingSite
    ? "create"
    : siteSettingsEqual(bundle.site, existingSite.settings)
      ? "unchanged"
      : "update";

  const existingPages = existingSite
    ? await repositories.pages.list(existingSite.id, { includeDeleted: true })
    : [];
  const byPath = new Map(existingPages.map((record) => [record.page.path, record]));
  const sourcePaths = new Set(bundle.pages.map((entry) => entry.page.path));

  const pages: PageImportPlanItem[] = bundle.pages.map((entry) => {
    const existing = byPath.get(entry.page.path);
    return {
      file: entry.file,
      path: entry.page.path,
      action: pageAction(entry.page, existing),
      pageId: existing?.id ?? null,
    };
  });

  const untouchedDatabasePages = existingPages
    .filter((record) => !sourcePaths.has(record.page.path))
    .map((record) => ({
      id: record.id,
      path: record.page.path,
      deletedAt: record.deletedAt,
    }));

  const existingRevisionChecksums = new Map<string, Set<string>>();
  if (existingSite) {
    for (const item of pages) {
      if (!item.pageId) continue;
      const current = await repositories.revisions.list(existingSite.id, item.pageId, {
        limit: 250,
      });
      existingRevisionChecksums.set(
        item.file,
        new Set(current.map((revision) => revision.checksum)),
      );
    }
  }

  const pagePathByFile = new Map(bundle.pages.map((entry) => [entry.file, entry.page.path]));
  const revisions = bundle.revisions
    .filter((revision) => pagePathByFile.has(revision.file))
    .map((revision): RevisionImportPlanItem => ({
      sourceId: revision.sourceId,
      file: revision.file,
      pagePath: pagePathByFile.get(revision.file)!,
      createdAt: revision.createdAt,
      checksum: revision.checksum,
      action: existingRevisionChecksums.get(revision.file)?.has(revision.checksum)
        ? "unchanged"
        : "create",
    }));

  const blockingIssues = bundle.orphanRevisions.length > 0
    ? [
        `${bundle.orphanRevisions.length} legacy revision(s) belong to page files that no longer exist. ` +
          "The importer will not discard that history. Re-run with --skip-revisions only if that loss is intentional.",
      ]
    : [];

  return {
    siteKey,
    site: {
      action: siteAction,
      siteId: existingSite?.id ?? null,
    },
    pages,
    revisions,
    untouchedDatabasePages,
    blockingIssues,
    summary: {
      pagesCreate: pages.filter((item) => item.action === "create").length,
      pagesUpdate: pages.filter((item) => item.action === "update").length,
      pagesReactivate: pages.filter((item) => item.action === "reactivate").length,
      pagesUnchanged: pages.filter((item) => item.action === "unchanged").length,
      revisionsCreate: revisions.filter((item) => item.action === "create").length,
      revisionsUnchanged: revisions.filter((item) => item.action === "unchanged").length,
    },
  };
}

export async function applyLegacyContentImport(
  bundle: LegacyContentBundle,
  siteKey: string,
  repositories: RepositorySet,
): Promise<LegacyImportWriteResult> {
  const plan = await planLegacyContentImport(bundle, siteKey, repositories);
  if (plan.blockingIssues.length > 0) {
    throw new Error(`Legacy import blocked: ${plan.blockingIssues.join(" ")}`);
  }

  let site = plan.site.siteId
    ? await repositories.sites.findById(plan.site.siteId)
    : null;
  if (plan.site.action !== "unchanged" || !site) {
    site = await repositories.sites.upsertByKey({
      key: plan.siteKey,
      settings: bundle.site,
    });
  }
  if (!site) throw new Error("Failed to resolve imported site.");

  const pageRecords = new Map<string, PageRecord>();
  let pagesWritten = 0;
  for (const sourcePage of bundle.pages) {
    const item = plan.pages.find((candidate) => candidate.file === sourcePage.file);
    if (!item) throw new Error(`Missing import plan for ${sourcePage.file}.`);

    let record: PageRecord | null;
    if (item.action === "unchanged" && item.pageId) {
      record = await repositories.pages.findById(site.id, item.pageId, {
        includeDeleted: true,
      });
    } else {
      record = await repositories.pages.upsertByPath(site.id, sourcePage.page);
      pagesWritten += 1;
    }

    if (!record) throw new Error(`Failed to resolve imported page ${sourcePage.file}.`);
    pageRecords.set(sourcePage.file, record);
  }

  const revisionByIdentity = new Map(
    bundle.revisions.map((revision) => [
      `${revision.file}:${revision.sourceId}:${revision.checksum}`,
      revision,
    ]),
  );
  let revisionsWritten = 0;
  for (const item of plan.revisions) {
    if (item.action === "unchanged") continue;
    const sourceRevision = revisionByIdentity.get(
      `${item.file}:${item.sourceId}:${item.checksum}`,
    );
    const pageRecord = pageRecords.get(item.file);
    if (!sourceRevision || !pageRecord) {
      throw new Error(`Failed to resolve legacy revision ${item.sourceId}.`);
    }

    await repositories.revisions.create({
      siteId: site.id,
      pageId: pageRecord.id,
      reason: sourceRevision.reason,
      page: sourceRevision.page,
      checksum: sourceRevision.checksum,
      createdAt: new Date(sourceRevision.createdAt),
    });
    revisionsWritten += 1;
  }

  return {
    plan,
    siteId: site.id,
    pagesWritten,
    revisionsWritten,
  };
}
