import {
  assertValidRedirects,
  inspectRedirects,
  internalRedirectTargetPath,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  sanitizeRedirectRule,
  type RedirectIssue,
  type RedirectRule,
  type RedirectSource,
  type RedirectStatus,
} from "./redirect-domain";
import { readStateJson, writeStateJson } from "./storage";
import { appendAdminLog } from "./admin-logs";
import { resolvePublicContentConfig } from "./content-source";
import { requireAdminSiteKey } from "./admin-tenant";
import {
  createPostgresRepositories,
  withPostgresTransaction,
  type RepositorySet,
} from "./repositories";

export {
  inspectRedirects,
  normalizeRedirectPath,
  normalizeRedirectTarget,
};
export type {
  RedirectIssue,
  RedirectRule,
  RedirectSource,
  RedirectStatus,
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

export function adminRedirectsUsePostgres(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolvePublicContentConfig(env).source === "postgres";
}

async function requirePostgresSite(repositories: RepositorySet) {
  const key = await requireAdminSiteKey();
  const site = await repositories.sites.findByKey(key);
  if (!site) {
    throw new Error(`No PostgreSQL Site exists for resolved tenant "${key}".`);
  }
  return site;
}

async function readLegacyDocument(): Promise<RedirectDocument> {
  const raw = await readStateJson<Partial<RedirectDocument>>("redirects.json");
  if (raw === null) return { ...EMPTY_DOCUMENT, redirects: [] };

  if (
    raw.schema !== "staark-redirects/v1" ||
    raw.version !== 1 ||
    !Array.isArray(raw.redirects)
  ) {
    throw new Error("Unsupported redirect storage format.");
  }

  return {
    schema: "staark-redirects/v1",
    version: 1,
    redirects: raw.redirects.map((rule) => sanitizeRedirectRule(rule, undefined, rule.updatedAt)),
  };
}

async function writeLegacyDocument(document: RedirectDocument): Promise<void> {
  await writeStateJson("redirects.json", document);
}

async function assertSourceIsNotActivePage(
  repositories: RepositorySet,
  siteId: string,
  from: string,
): Promise<void> {
  const page = await repositories.pages.findByPath(siteId, from);
  if (page) {
    throw new Error(
      `Redirect source ${from} is an active page. Move or delete the page first.`,
    );
  }
}

export async function preparePostgresPageDestinationRedirect(
  repositories: RepositorySet,
  siteId: string,
  destinationPath: string,
  currentPath: string,
): Promise<RedirectRule | null> {
  const destination = normalizeRedirectPath(destinationPath);
  const current = normalizeRedirectPath(currentPath);
  const existing = await repositories.redirects.findByFrom(siteId, destination);
  if (!existing) return null;

  // Reversing a previous page move is safe: /old -> /current becomes
  // /current -> /old. Remove the old auto rule inside the same transaction.
  if (
    existing.source === "page-path-change" &&
    internalRedirectTargetPath(existing.to) === current
  ) {
    await repositories.redirects.delete(siteId, existing.id);
    return null;
  }

  return existing;
}

export async function upsertPostgresRedirectWithRepositories(
  repositories: RepositorySet,
  siteId: string,
  from: string,
  to: string,
  status: RedirectStatus = 301,
  source: RedirectSource = "manual",
): Promise<RedirectRule> {
  const normalizedFrom = normalizeRedirectPath(from);
  await assertSourceIsNotActivePage(repositories, siteId, normalizedFrom);

  const rules = await repositories.redirects.list(siteId);
  const existingIndex = rules.findIndex((rule) => rule.from === normalizedFrom);
  const existing = existingIndex >= 0 ? rules[existingIndex] : undefined;
  const rule = sanitizeRedirectRule(
    { from: normalizedFrom, to, status, enabled: true, source },
    existing,
  );
  rule.source = source;

  const candidate: RedirectRule[] = [...rules];
  if (existingIndex >= 0) candidate[existingIndex] = rule;
  else candidate.push(rule);
  assertValidRedirects(candidate);

  const saved = await repositories.redirects.upsertByFrom({
    siteId,
    ...rule,
  });
  return saved;
}

export async function listRedirects(): Promise<{
  redirects: RedirectRule[];
  issues: RedirectIssue[];
}> {
  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    return {
      redirects: [...document.redirects].sort((a, b) => a.from.localeCompare(b.from)),
      issues: inspectRedirects(document.redirects),
    };
  }

  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  const redirects = await repositories.redirects.list(site.id);
  return { redirects, issues: inspectRedirects(redirects) };
}

export async function createRedirect(
  input: Partial<RedirectRule>,
): Promise<RedirectRule> {
  let rule: RedirectRule;

  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    rule = sanitizeRedirectRule({ ...input, source: "manual" });
    if (document.redirects.some((existing) => existing.from === rule.from)) {
      throw new Error(`A redirect from ${rule.from} already exists.`);
    }
    const redirects = [...document.redirects, rule];
    assertValidRedirects(redirects);
    await writeLegacyDocument({ ...document, redirects });
  } else {
    rule = await withPostgresTransaction(async (repositories) => {
      const site = await requirePostgresSite(repositories);
      const candidateRule = sanitizeRedirectRule({ ...input, source: "manual" });
      await assertSourceIsNotActivePage(repositories, site.id, candidateRule.from);
      const rules = await repositories.redirects.list(site.id);
      if (rules.some((existing) => existing.from === candidateRule.from)) {
        throw new Error(`A redirect from ${candidateRule.from} already exists.`);
      }
      assertValidRedirects([...rules, candidateRule]);
      return repositories.redirects.create({ siteId: site.id, ...candidateRule });
    });
  }

  await appendAdminLog({
    area: "redirects",
    action: "redirect.created",
    message: `Redirect ${rule.from} → ${rule.to} created.`,
    meta: { from: rule.from, to: rule.to, status: rule.status },
  });
  return rule;
}

export async function updateRedirect(
  id: string,
  input: Partial<RedirectRule>,
): Promise<RedirectRule> {
  let updated: RedirectRule;

  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    const index = document.redirects.findIndex((rule) => rule.id === id);
    if (index < 0) throw new Error("Redirect not found.");

    updated = sanitizeRedirectRule(input, document.redirects[index]);
    const redirects = [...document.redirects];
    redirects[index] = updated;
    if (redirects.some((rule, ruleIndex) => ruleIndex !== index && rule.from === updated.from)) {
      throw new Error(`A redirect from ${updated.from} already exists.`);
    }
    assertValidRedirects(redirects);
    await writeLegacyDocument({ ...document, redirects });
  } else {
    updated = await withPostgresTransaction(async (repositories) => {
      const site = await requirePostgresSite(repositories);
      const current = await repositories.redirects.findById(site.id, id);
      if (!current) throw new Error("Redirect not found.");

      const next = sanitizeRedirectRule(input, current);
      await assertSourceIsNotActivePage(repositories, site.id, next.from);
      const rules = await repositories.redirects.list(site.id);
      const index = rules.findIndex((rule) => rule.id === id);
      const candidate: RedirectRule[] = [...rules];
      candidate[index] = next;
      if (candidate.some((rule, ruleIndex) => ruleIndex !== index && rule.from === next.from)) {
        throw new Error(`A redirect from ${next.from} already exists.`);
      }
      assertValidRedirects(candidate);
      const saved = await repositories.redirects.update(site.id, id, next);
      if (!saved) throw new Error("Redirect not found.");
      return saved;
    });
  }

  await appendAdminLog({
    area: "redirects",
    action: "redirect.updated",
    message: `Redirect ${updated.from} was updated.`,
    meta: {
      from: updated.from,
      to: updated.to,
      status: updated.status,
      enabled: updated.enabled,
    },
  });
  return updated;
}

export async function deleteRedirect(id: string): Promise<void> {
  let removed: RedirectRule | null = null;

  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    removed = document.redirects.find((rule) => rule.id === id) ?? null;
    const redirects = document.redirects.filter((rule) => rule.id !== id);
    if (redirects.length === document.redirects.length) {
      throw new Error("Redirect not found.");
    }
    await writeLegacyDocument({ ...document, redirects });
  } else {
    await withPostgresTransaction(async (repositories) => {
      const site = await requirePostgresSite(repositories);
      removed = await repositories.redirects.findById(site.id, id);
      if (!removed) throw new Error("Redirect not found.");
      const deleted = await repositories.redirects.delete(site.id, id);
      if (!deleted) throw new Error("Redirect not found.");
    });
  }

  await appendAdminLog({
    area: "redirects",
    action: "redirect.deleted",
    message: removed
      ? `Redirect ${removed.from} → ${removed.to} deleted.`
      : "Redirect deleted.",
    meta: removed ? { from: removed.from, to: removed.to } : undefined,
  });
}

export async function upsertRedirect(
  from: string,
  to: string,
  status: RedirectStatus = 301,
  source: RedirectSource = "manual",
): Promise<RedirectRule> {
  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    const normalizedFrom = normalizeRedirectPath(from);
    const existingIndex = document.redirects.findIndex(
      (rule) => rule.from === normalizedFrom,
    );
    const existing = existingIndex >= 0 ? document.redirects[existingIndex] : undefined;
    const rule = sanitizeRedirectRule(
      { from: normalizedFrom, to, status, enabled: true, source },
      existing,
    );
    rule.source = source;
    const redirects = [...document.redirects];
    if (existingIndex >= 0) redirects[existingIndex] = rule;
    else redirects.push(rule);
    assertValidRedirects(redirects);
    await writeLegacyDocument({ ...document, redirects });
    return rule;
  }

  return withPostgresTransaction(async (repositories) => {
    const site = await requirePostgresSite(repositories);
    return upsertPostgresRedirectWithRepositories(
      repositories,
      site.id,
      from,
      to,
      status,
      source,
    );
  });
}

export async function findMatchingRedirect(
  pathname: string,
): Promise<RedirectRule | null> {
  const normalized = normalizeRedirectPath(pathname);

  if (!adminRedirectsUsePostgres()) {
    const document = await readLegacyDocument();
    return (
      document.redirects.find(
        (rule) => rule.enabled && rule.from === normalized,
      ) ?? null
    );
  }

  // Proxy runs in Node.js in Next 16. This is a single indexed lookup by
  // (site_id, from_path), not a scan of all redirect rules.
  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  const redirect = await repositories.redirects.findByFrom(site.id, normalized);
  return redirect?.enabled ? redirect : null;
}
