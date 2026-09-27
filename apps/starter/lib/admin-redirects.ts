import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type RedirectStatus = 301 | 302;

export type RedirectRule = {
  id: string;
  from: string;
  to: string;
  status: RedirectStatus;
  enabled: boolean;
  source: "manual" | "page-path-change";
  createdAt: string;
  updatedAt: string;
};

export type RedirectIssue = {
  severity: "error" | "warning";
  ruleId?: string;
  message: string;
};

type RedirectDocument = {
  schema: "staark-redirects/v1";
  version: 1;
  redirects: RedirectRule[];
};

const EMPTY_DOCUMENT: RedirectDocument = {
  schema: "staark-redirects/v1",
  version: 1,
  redirects: [],
};

function redirectFile(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".staark",
    "redirects.json",
  );
}

export function normalizeRedirectPath(value: string): string {
  let pathValue = value.trim();
  if (!pathValue.startsWith("/")) {
    throw new Error("Source must start with /.");
  }
  if (pathValue.includes("?") || pathValue.includes("#")) {
    throw new Error("Source cannot contain a query string or hash.");
  }
  if (
    pathValue === "/admin" ||
    pathValue.startsWith("/admin/") ||
    pathValue.startsWith("/api/") ||
    pathValue.startsWith("/_next/") ||
    pathValue.startsWith("/uploads/")
  ) {
    throw new Error("That source path is reserved by the platform.");
  }
  pathValue = pathValue.replace(/\/{2,}/g, "/");
  if (pathValue.length > 1) pathValue = pathValue.replace(/\/+$/, "");
  return pathValue || "/";
}

export function normalizeRedirectTarget(value: string): string {
  const target = value.trim();
  if (!target) throw new Error("Destination cannot be empty.");

  if (target.startsWith("/")) {
    const [pathname, suffix = ""] = target.split(/(?=[?#])/u, 2);
    const normalized = normalizeRedirectPath(pathname ?? "/");
    return `${normalized}${suffix}`;
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("Destination must be an internal path or an http(s) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("External redirects only support http and https.");
  }
  return url.toString();
}

function internalTargetPath(target: string): string | null {
  if (!target.startsWith("/")) return null;
  return normalizeRedirectPath(target.split(/[?#]/u, 1)[0] || "/");
}

function sanitizeRule(input: Partial<RedirectRule>, existing?: RedirectRule): RedirectRule {
  const now = new Date().toISOString();
  const from = normalizeRedirectPath(String(input.from ?? existing?.from ?? ""));
  const to = normalizeRedirectTarget(String(input.to ?? existing?.to ?? ""));
  const status = Number(input.status ?? existing?.status ?? 301);
  if (status !== 301 && status !== 302) {
    throw new Error("Redirect status must be 301 or 302.");
  }

  if (internalTargetPath(to) === from) {
    throw new Error("Source and destination cannot be the same path.");
  }

  return {
    id: existing?.id ?? randomUUID(),
    from,
    to,
    status: status as RedirectStatus,
    enabled: input.enabled ?? existing?.enabled ?? true,
    source: existing?.source ?? input.source ?? "manual",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

async function readDocument(): Promise<RedirectDocument> {
  try {
    const raw = JSON.parse(await readFile(redirectFile(), "utf8")) as Partial<RedirectDocument>;
    if (raw.schema !== "staark-redirects/v1" || raw.version !== 1 || !Array.isArray(raw.redirects)) {
      throw new Error("Unsupported redirect storage format.");
    }
    return {
      schema: "staark-redirects/v1",
      version: 1,
      redirects: raw.redirects,
    } as RedirectDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_DOCUMENT, redirects: [] };
    throw error;
  }
}

async function writeDocument(document: RedirectDocument): Promise<void> {
  const target = redirectFile();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;

  try {
    await writeFile(temporary, JSON.stringify(document, null, 2) + "\n", "utf8");
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function inspectRedirects(rules: RedirectRule[]): RedirectIssue[] {
  const issues: RedirectIssue[] = [];
  const enabled = rules.filter((rule) => rule.enabled);
  const bySource = new Map<string, RedirectRule[]>();

  for (const rule of rules) {
    const group = bySource.get(rule.from) ?? [];
    group.push(rule);
    bySource.set(rule.from, group);
  }

  for (const [source, group] of bySource) {
    if (group.length > 1) {
      issues.push({
        severity: "error",
        message: `Duplicate source ${source}. Only one redirect may own a source path.`,
      });
    }
  }

  const active = new Map(enabled.map((rule) => [rule.from, rule]));
  for (const rule of enabled) {
    const targetPath = internalTargetPath(rule.to);
    if (targetPath && active.has(targetPath)) {
      issues.push({
        severity: "warning",
        ruleId: rule.id,
        message: `${rule.from} creates a redirect chain through ${targetPath}.`,
      });
    }

    const visited = new Set<string>();
    let cursor = rule.from;
    while (active.has(cursor)) {
      if (visited.has(cursor)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Redirect loop detected starting at ${rule.from}.`,
        });
        break;
      }
      visited.add(cursor);
      const next = active.get(cursor)!;
      const nextPath = internalTargetPath(next.to);
      if (!nextPath) break;
      cursor = nextPath;
    }
  }

  return issues.filter(
    (issue, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.severity === issue.severity &&
          candidate.ruleId === issue.ruleId &&
          candidate.message === issue.message,
      ) === index,
  );
}

function assertValidRules(rules: RedirectRule[]): void {
  const errors = inspectRedirects(rules).filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(errors[0]!.message);
}

export async function listRedirects(): Promise<{
  redirects: RedirectRule[];
  issues: RedirectIssue[];
}> {
  const document = await readDocument();
  return {
    redirects: [...document.redirects].sort((a, b) => a.from.localeCompare(b.from)),
    issues: inspectRedirects(document.redirects),
  };
}

export async function createRedirect(input: Partial<RedirectRule>): Promise<RedirectRule> {
  const document = await readDocument();
  const rule = sanitizeRule({ ...input, source: "manual" });

  if (document.redirects.some((existing) => existing.from === rule.from)) {
    throw new Error(`A redirect from ${rule.from} already exists.`);
  }

  const redirects = [...document.redirects, rule];
  assertValidRules(redirects);
  await writeDocument({ ...document, redirects });
  return rule;
}

export async function updateRedirect(
  id: string,
  input: Partial<RedirectRule>,
): Promise<RedirectRule> {
  const document = await readDocument();
  const index = document.redirects.findIndex((rule) => rule.id === id);
  if (index < 0) throw new Error("Redirect not found.");

  const updated = sanitizeRule(input, document.redirects[index]);
  const redirects = [...document.redirects];
  redirects[index] = updated;

  const duplicate = redirects.find((rule, ruleIndex) => ruleIndex !== index && rule.from === updated.from);
  if (duplicate) throw new Error(`A redirect from ${updated.from} already exists.`);

  assertValidRules(redirects);
  await writeDocument({ ...document, redirects });
  return updated;
}

export async function deleteRedirect(id: string): Promise<void> {
  const document = await readDocument();
  const redirects = document.redirects.filter((rule) => rule.id !== id);
  if (redirects.length === document.redirects.length) throw new Error("Redirect not found.");
  await writeDocument({ ...document, redirects });
}

export async function upsertRedirect(
  from: string,
  to: string,
  status: RedirectStatus = 301,
  source: RedirectRule["source"] = "manual",
): Promise<RedirectRule> {
  const document = await readDocument();
  const normalizedFrom = normalizeRedirectPath(from);
  const existingIndex = document.redirects.findIndex((rule) => rule.from === normalizedFrom);

  const existing = existingIndex >= 0 ? document.redirects[existingIndex] : undefined;
  const rule = sanitizeRule(
    { from: normalizedFrom, to, status, enabled: true, source },
    existing,
  );
  rule.source = source;

  const redirects = [...document.redirects];
  if (existingIndex >= 0) redirects[existingIndex] = rule;
  else redirects.push(rule);

  assertValidRules(redirects);
  await writeDocument({ ...document, redirects });
  return rule;
}

export async function findMatchingRedirect(pathname: string): Promise<RedirectRule | null> {
  const normalized = normalizeRedirectPath(pathname);
  const document = await readDocument();
  return document.redirects.find((rule) => rule.enabled && rule.from === normalized) ?? null;
}
