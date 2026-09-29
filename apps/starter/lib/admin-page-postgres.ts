import {
  normalizePath,
  PageSchema,
  SiteSettingsSchema,
  type Page,
  type SiteSettings,
} from "@staark/core";

import { resolvePublicContentConfig } from "./content-source";
import {
  preparePostgresPageDestinationRedirect,
  upsertPostgresRedirectWithRepositories,
} from "./admin-redirects";
import {
  createPostgresRepositories,
  withPostgresTransaction,
  type PageRecord,
  type RepositorySet,
  type SiteRecord,
} from "./repositories";

export class AdminPageConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminPageConflictError";
  }
}

export class AdminPageNotFoundError extends Error {
  constructor(message = "Page not found.") {
    super(message);
    this.name = "AdminPageNotFoundError";
  }
}

export class AdminPageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminPageValidationError";
  }
}

export type PostgresAdminPageSummary = {
  file: string;
  path: string;
  title: string;
  inPrimary: boolean;
  inFooter: boolean;
  navigationLabel?: string;
};

export type PostgresAdminDeletedPageSummary = PostgresAdminPageSummary & {
  deletedAt: string;
};

export type PostgresAdminRevisionSummary = {
  id: string;
  file: string;
  createdAt: string;
  reason: string;
  sha256: string;
  title: string;
  path: string;
  blocks: number;
};

export function adminPagesUsePostgres(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolvePublicContentConfig(env).source === "postgres";
}

function isPageId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function siteKey(): string {
  const config = resolvePublicContentConfig();
  if (config.source !== "postgres" || !config.siteKey) {
    throw new Error(
      "PostgreSQL Admin Pages requires STAARK_DATA_SOURCE=postgres and STAARK_SITE_KEY.",
    );
  }
  return config.siteKey;
}

async function requireSite(repositories: RepositorySet): Promise<SiteRecord> {
  const key = siteKey();
  const site = await repositories.sites.findByKey(key);
  if (!site) {
    throw new Error(`No PostgreSQL Site exists for STAARK_SITE_KEY="${key}".`);
  }
  return site;
}

function normalizePage(input: unknown): Page {
  const parsed = PageSchema.parse(input);
  const page = PageSchema.parse({
    ...parsed,
    path: normalizePath(parsed.path),
  });

  const ids = new Set<string>();
  for (const block of page.blocks) {
    if (ids.has(block.id)) {
      throw new AdminPageValidationError(
        `Duplicate block id "${block.id}". Block ids must be unique within a page.`,
      );
    }
    ids.add(block.id);
  }

  return page;
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

function comparablePage(page: Page): unknown {
  const { updatedAt: _updatedAt, ...content } = page;
  return stableValue(content);
}

function pageChanged(current: Page, incoming: Page): boolean {
  return JSON.stringify(comparablePage(current)) !== JSON.stringify(comparablePage(incoming));
}

function withoutPath(
  links: Array<{ label: string; href: string }>,
  pathname: string,
): Array<{ label: string; href: string }> {
  return links.filter((link) => link.href !== pathname);
}

function withNavigation(
  settings: SiteSettings,
  pathname: string,
  label: string,
  primary: boolean,
  footer: boolean,
): SiteSettings {
  const navigation = settings.navigation;
  const primaryLinks = withoutPath(navigation.primary, pathname);
  const footerLinks = withoutPath(navigation.footer, pathname);

  return SiteSettingsSchema.parse({
    ...settings,
    navigation: {
      ...navigation,
      primary: primary
        ? [...primaryLinks, { label, href: pathname }]
        : primaryLinks,
      footer: footer
        ? [...footerLinks, { label, href: pathname }]
        : footerLinks,
    },
  });
}

function withoutNavigationPath(
  settings: SiteSettings,
  pathname: string,
): SiteSettings {
  return SiteSettingsSchema.parse({
    ...settings,
    navigation: {
      ...settings.navigation,
      primary: withoutPath(settings.navigation.primary, pathname),
      footer: withoutPath(settings.navigation.footer, pathname),
      footerColumns: settings.navigation.footerColumns.map((column) => ({
        ...column,
        links: withoutPath(column.links, pathname),
      })),
      cta:
        settings.navigation.cta?.href === pathname
          ? undefined
          : settings.navigation.cta,
    },
  });
}

function replaceNavigationPath(
  settings: SiteSettings,
  from: string,
  to: string,
): SiteSettings {
  const rewrite = (links: Array<{ label: string; href: string }>) =>
    links.map((link) =>
      link.href === from ? { ...link, href: to } : link,
    );

  return SiteSettingsSchema.parse({
    ...settings,
    navigation: {
      ...settings.navigation,
      primary: rewrite(settings.navigation.primary),
      footer: rewrite(settings.navigation.footer),
      footerColumns: settings.navigation.footerColumns.map((column) => ({
        ...column,
        links: rewrite(column.links),
      })),
      cta:
        settings.navigation.cta?.href === from
          ? { ...settings.navigation.cta, href: to }
          : settings.navigation.cta,
    },
  });
}

type DeletedNavigationLinkPlacement = {
  index: number;
  link: {
    label: string;
    href: string;
  };
};

type DeletedNavigationColumnPlacement = {
  columnIndex: number;
  links: DeletedNavigationLinkPlacement[];
};

type DeletedNavigationContext = {
  version: 1;
  primary: DeletedNavigationLinkPlacement[];
  footer: DeletedNavigationLinkPlacement[];
  footerColumns: DeletedNavigationColumnPlacement[];
  cta: {
    label: string;
    href: string;
  } | null;
};

function captureLinkPlacements(
  links: Array<{ label: string; href: string }>,
  pathname: string,
): DeletedNavigationLinkPlacement[] {
  return links.flatMap((link, index) =>
    link.href === pathname
      ? [{ index, link: { ...link } }]
      : [],
  );
}

function captureDeletedNavigationContext(
  settings: SiteSettings,
  pathname: string,
): DeletedNavigationContext {
  return {
    version: 1,
    primary: captureLinkPlacements(
      settings.navigation.primary,
      pathname,
    ),
    footer: captureLinkPlacements(
      settings.navigation.footer,
      pathname,
    ),
    footerColumns:
      settings.navigation.footerColumns.flatMap(
        (column, columnIndex) => {
          const links = captureLinkPlacements(
            column.links,
            pathname,
          );

          return links.length > 0
            ? [{ columnIndex, links }]
            : [];
        },
      ),
    cta:
      settings.navigation.cta?.href === pathname
        ? { ...settings.navigation.cta }
        : null,
  };
}

function isNavigationLink(
  value: unknown,
): value is { label: string; href: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.label === "string" &&
    typeof record.href === "string"
  );
}

function parseLinkPlacements(
  value: unknown,
): DeletedNavigationLinkPlacement[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return [];
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record.index !== "number" ||
      !Number.isInteger(record.index) ||
      record.index < 0 ||
      !isNavigationLink(record.link)
    ) {
      return [];
    }

    return [{
      index: record.index,
      link: record.link,
    }];
  });
}

function parseDeletedNavigationContext(
  value: unknown,
): DeletedNavigationContext | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;

  const rawColumns = Array.isArray(record.footerColumns)
    ? record.footerColumns
    : [];

  const footerColumns =
    rawColumns.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return [];
      }

      const column =
        item as Record<string, unknown>;

      if (
        typeof column.columnIndex !== "number" ||
        !Number.isInteger(column.columnIndex) ||
        column.columnIndex < 0
      ) {
        return [];
      }

      const links =
        parseLinkPlacements(column.links);

      return links.length > 0
        ? [{
            columnIndex: column.columnIndex,
            links,
          }]
        : [];
    });

  return {
    version: 1,
    primary: parseLinkPlacements(record.primary),
    footer: parseLinkPlacements(record.footer),
    footerColumns,
    cta: isNavigationLink(record.cta)
      ? record.cta
      : null,
  };
}

function restoreLinkPlacements(
  current: Array<{ label: string; href: string }>,
  pathname: string,
  placements: DeletedNavigationLinkPlacement[],
): Array<{ label: string; href: string }> {
  const next = current.filter(
    (link) => link.href !== pathname,
  );

  for (
    const placement of [...placements].sort(
      (a, b) => a.index - b.index,
    )
  ) {
    const index = Math.min(
      placement.index,
      next.length,
    );

    next.splice(index, 0, {
      ...placement.link,
      href: pathname,
    });
  }

  return next;
}

function restoreDeletedNavigationContext(
  settings: SiteSettings,
  pathname: string,
  rawContext: unknown,
): SiteSettings {
  const context =
    parseDeletedNavigationContext(rawContext);

  if (!context) return settings;

  const footerColumns =
    settings.navigation.footerColumns.map(
      (column, columnIndex) => {
        const placement =
          context.footerColumns.find(
            (item) =>
              item.columnIndex === columnIndex,
          );

        if (!placement) return column;

        return {
          ...column,
          links: restoreLinkPlacements(
            column.links,
            pathname,
            placement.links,
          ),
        };
      },
    );

  const currentCta = settings.navigation.cta;

  const restoredCta =
    context.cta &&
    (!currentCta || currentCta.href === pathname)
      ? {
          ...context.cta,
          href: pathname,
        }
      : currentCta;

  return SiteSettingsSchema.parse({
    ...settings,
    navigation: {
      ...settings.navigation,
      primary: restoreLinkPlacements(
        settings.navigation.primary,
        pathname,
        context.primary,
      ),
      footer: restoreLinkPlacements(
        settings.navigation.footer,
        pathname,
        context.footer,
      ),
      footerColumns,
      cta: restoredCta,
    },
  });
}

async function assertPathAvailable(
  repositories: RepositorySet,
  siteId: string,
  pathname: string,
  currentPageId?: string,
): Promise<PageRecord | null> {
  const existing = await repositories.pages.findByPath(siteId, pathname, {
    includeDeleted: true,
  });
  if (existing && existing.id !== currentPageId && !existing.deletedAt) {
    throw new AdminPageConflictError(
      `A page with path ${pathname} already exists.`,
    );
  }
  if (existing && existing.id !== currentPageId && existing.deletedAt && currentPageId) {
    throw new AdminPageConflictError(
      `Path ${pathname} belongs to a deleted page. Restore or reuse that page before moving another page to this path.`,
    );
  }

  const current = currentPageId
    ? await repositories.pages.findById(siteId, currentPageId, { includeDeleted: true })
    : null;
  const blockingRedirect = await preparePostgresPageDestinationRedirect(
    repositories,
    siteId,
    pathname,
    current?.page.path ?? pathname,
  );
  if (blockingRedirect) {
    throw new AdminPageConflictError(
      `Path ${pathname} is reserved by redirect ${blockingRedirect.from} → ${blockingRedirect.to}. Delete or change that redirect first.`,
    );
  }

  return existing;
}

export async function getPostgresAdminSiteSettings(): Promise<SiteSettings> {
  return (await requireSite(createPostgresRepositories())).settings;
}

export async function listPostgresAdminPages(): Promise<{
  site: SiteSettings;
  pages: PostgresAdminPageSummary[];
  deletedPages: PostgresAdminDeletedPageSummary[];
}> {
  const repositories = createPostgresRepositories();
  const site = await requireSite(repositories);
  const records = await repositories.pages.list(site.id, {
    includeDeleted: true,
  });
  const primary = site.settings.navigation.primary;
  const footer = site.settings.navigation.footer;

  const summaryFor = (record: PageRecord): PostgresAdminPageSummary => ({
    // `file` remains the API/UI compatibility key. In PostgreSQL mode it is
    // the stable Page UUID rather than a JSON filename.
    file: record.id,
    path: record.page.path,
    title: record.page.title,
    inPrimary: primary.some((link) => link.href === record.page.path),
    inFooter: footer.some((link) => link.href === record.page.path),
    navigationLabel:
      primary.find((link) => link.href === record.page.path)?.label ??
      footer.find((link) => link.href === record.page.path)?.label,
  });

  return {
    site: site.settings,
    pages: records
      .filter((record) => !record.deletedAt)
      .map(summaryFor),
    deletedPages: records
      .filter(
        (record): record is PageRecord & { deletedAt: string } =>
          Boolean(record.deletedAt),
      )
      .map((record) => ({
        ...summaryFor(record),
        deletedAt: record.deletedAt,
      })),
  };
}

export async function createPostgresAdminPage(input: {
  page: unknown;
  addToPrimary: boolean;
  addToFooter: boolean;
  navigationLabel: string;
}): Promise<PageRecord> {
  const page = normalizePage(input.page);

  return withPostgresTransaction(async (repositories) => {
    const site = await requireSite(repositories);
    const existing = await assertPathAvailable(
      repositories,
      site.id,
      page.path,
    );

    let record: PageRecord;
    if (existing?.deletedAt) {
      const restored = await repositories.pages.replace(site.id, existing.id, page);
      if (!restored) throw new AdminPageNotFoundError();
      record = restored;
    } else {
      record = await repositories.pages.upsertByPath(site.id, page);
    }

    if (input.addToPrimary || input.addToFooter) {
      const settings = withNavigation(
        site.settings,
        record.page.path,
        input.navigationLabel.trim() || record.page.title,
        input.addToPrimary,
        input.addToFooter,
      );
      await repositories.sites.upsertByKey({ key: site.key, settings });
    }

    return record;
  });
}

export async function readPostgresAdminPage(
  pageId: string,
): Promise<PageRecord | null> {
  if (!isPageId(pageId)) return null;
  const repositories = createPostgresRepositories();
  const site = await requireSite(repositories);
  return repositories.pages.findById(site.id, pageId);
}

export async function savePostgresAdminPage(
  pageId: string,
  input: unknown,
): Promise<{
  record: PageRecord;
  previousPath: string;
  pathChanged: boolean;
} | null> {
  if (!isPageId(pageId)) return null;
  const page = normalizePage(input);

  return withPostgresTransaction(async (repositories) => {
    const site = await requireSite(repositories);
    const current = await repositories.pages.findById(site.id, pageId);
    if (!current) return null;

    if (page.path !== current.page.path) {
      await assertPathAvailable(repositories, site.id, page.path, pageId);
    }

    const changed = pageChanged(current.page, page);
    if (!changed) {
      return {
        record: current,
        previousPath: current.page.path,
        pathChanged: false,
      };
    }

    await repositories.revisions.create({
      siteId: site.id,
      pageId,
      reason: "before-save",
      page: current.page,
    });

    const saved = await repositories.pages.replace(site.id, pageId, page);
    if (!saved) throw new AdminPageNotFoundError();

    const pathChanged = current.page.path !== saved.page.path;
    if (pathChanged) {
      const settings = replaceNavigationPath(
        site.settings,
        current.page.path,
        saved.page.path,
      );
      await repositories.sites.upsertByKey({ key: site.key, settings });
      await upsertPostgresRedirectWithRepositories(
        repositories,
        site.id,
        current.page.path,
        saved.page.path,
        301,
        "page-path-change",
      );
    }

    return {
      record: saved,
      previousPath: current.page.path,
      pathChanged,
    };
  });
}

export async function deletePostgresAdminPage(
  pageId: string,
): Promise<PageRecord | null> {
  if (!isPageId(pageId)) return null;

  return withPostgresTransaction(async (repositories) => {
    const site = await requireSite(repositories);
    const current = await repositories.pages.findById(site.id, pageId);
    if (!current) return null;

    await repositories.revisions.create({
      siteId: site.id,
      pageId,
      reason: "before-delete",
      page: current.page,
    });

    const deletedContext =
      captureDeletedNavigationContext(
        site.settings,
        current.page.path,
      );

    const deleted = await repositories.pages.softDelete(
      site.id,
      pageId,
      undefined,
      deletedContext,
    );
    if (!deleted) throw new AdminPageNotFoundError();

    const settings = withoutNavigationPath(
      site.settings,
      current.page.path,
    );
    await repositories.sites.upsertByKey({ key: site.key, settings });

    return deleted;
  });
}

export async function restorePostgresAdminPage(
  pageId: string,
): Promise<PageRecord | null> {
  if (!isPageId(pageId)) return null;

  return withPostgresTransaction(async (repositories) => {
    const site = await requireSite(repositories);

    const current = await repositories.pages.findById(
      site.id,
      pageId,
      { includeDeleted: true },
    );

    if (!current || !current.deletedAt) {
      return null;
    }

    // Re-check the destination before reviving the page so a redirect or
    // another active page cannot silently make the restored URL ambiguous.
    await assertPathAvailable(
      repositories,
      site.id,
      current.page.path,
      pageId,
    );

    await repositories.revisions.create({
      siteId: site.id,
      pageId,
      reason: "before-restore",
      page: current.page,
    });

    const restored = await repositories.pages.replace(
      site.id,
      pageId,
      current.page,
    );

    if (!restored) {
      throw new AdminPageNotFoundError();
    }

    const settings =
      restoreDeletedNavigationContext(
        site.settings,
        restored.page.path,
        current.deletedContext,
      );

    if (
      JSON.stringify(settings) !==
      JSON.stringify(site.settings)
    ) {
      await repositories.sites.upsertByKey({
        key: site.key,
        settings,
      });
    }

    return restored;
  });
}

export async function listPostgresAdminPageRevisions(
  pageId: string,
): Promise<PostgresAdminRevisionSummary[]> {
  if (!isPageId(pageId)) throw new AdminPageNotFoundError();
  const repositories = createPostgresRepositories();
  const site = await requireSite(repositories);
  const page = await repositories.pages.findById(site.id, pageId, {
    includeDeleted: true,
  });
  if (!page) throw new AdminPageNotFoundError();

  const revisions = await repositories.revisions.list(site.id, pageId);
  return revisions.map((revision) => ({
    id: revision.id,
    file: pageId,
    createdAt: revision.createdAt,
    reason: revision.reason,
    sha256: revision.checksum,
    title: revision.page.title,
    path: revision.page.path,
    blocks: revision.page.blocks.length,
  }));
}

export async function restorePostgresAdminPageRevision(
  pageId: string,
  revisionId: string,
): Promise<Page> {
  if (!isPageId(pageId)) throw new AdminPageNotFoundError();

  return withPostgresTransaction(async (repositories) => {
    const site = await requireSite(repositories);
    const current = await repositories.pages.findById(site.id, pageId, {
      includeDeleted: true,
    });
    if (!current) throw new AdminPageNotFoundError();

    const revision = await repositories.revisions.findById(
      site.id,
      pageId,
      revisionId,
    );
    if (!revision) throw new AdminPageNotFoundError("Revision not found.");

    const target = normalizePage(revision.page);
    if (target.path !== current.page.path) {
      await assertPathAvailable(repositories, site.id, target.path, pageId);
    }

    await repositories.revisions.create({
      siteId: site.id,
      pageId,
      reason: "before-restore",
      page: current.page,
    });

    const restored = await repositories.pages.replace(site.id, pageId, target);
    if (!restored) throw new AdminPageNotFoundError();

    if (current.page.path !== restored.page.path) {
      const settings = replaceNavigationPath(
        site.settings,
        current.page.path,
        restored.page.path,
      );
      await repositories.sites.upsertByKey({ key: site.key, settings });
      await upsertPostgresRedirectWithRepositories(
        repositories,
        site.id,
        current.page.path,
        restored.page.path,
        301,
        "page-path-change",
      );
    }

    return restored.page;
  });
}
