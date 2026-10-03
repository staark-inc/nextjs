import { headers } from "next/headers";
import {
  PageSchema,
  SiteSettingsSchema,
  type Page,
  type SiteSettings,
} from "@staark/core";

import { resolvePublicContentConfig } from "./content-source";
import { resolveTenantContext } from "./tenant-context";
import {
  createPostgresRepositories,
  withPostgresTransaction,
  type RepositorySet,
  type SiteRecord,
} from "./repositories";
import {
  contentStoragePath,
  listContent,
  readContentJson,
  writeContentJson,
} from "./storage";

export type AdminContentPage = {
  /** UI/API compatibility id: Page UUID in postgres mode, filename in legacy mode. */
  file: string;
  page: Page;
};

export function adminSiteSettingsUsePostgres(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolvePublicContentConfig(env).source === "postgres";
}

async function postgresSiteKey(): Promise<string> {
  const config = resolvePublicContentConfig();
  if (config.source !== "postgres") {
    throw new Error(
      "PostgreSQL Admin Site Settings requires STAARK_DATA_SOURCE=postgres.",
    );
  }

  try {
    const requestHeaders = await headers();
    const tenant = await resolveTenantContext({
      host: requestHeaders.get("host"),
      forwardedHost: requestHeaders.get("x-forwarded-host"),
    });
    if (tenant) return tenant.siteKey;
  } catch {
    // Build jobs and one-shot scripts may not have request context.
  }

  if (config.siteKey) return config.siteKey;

  throw new Error(
    "No PostgreSQL admin tenant could be resolved from the request hostname.",
  );
}

async function requirePostgresSite(
  repositories: RepositorySet,
): Promise<SiteRecord> {
  const key = await postgresSiteKey();
  const site = await repositories.sites.findByKey(key);
  if (!site) {
    throw new Error(`No PostgreSQL Site exists for STAARK_SITE_KEY="${key}".`);
  }
  return site;
}

async function readLegacySiteSettings(): Promise<SiteSettings> {
  const raw = await readContentJson<unknown>("site.json");
  if (raw === null) throw new Error("Site settings not found.");
  return SiteSettingsSchema.parse(raw);
}

export async function readAdminSiteSettings(): Promise<SiteSettings> {
  if (!adminSiteSettingsUsePostgres()) return readLegacySiteSettings();
  const site = await requirePostgresSite(createPostgresRepositories());

  // Existing tenants may predate newer SiteSettings fields.
  // Always parse on read so schema defaults are applied without requiring
  // a destructive data migration.
  return SiteSettingsSchema.parse(
    site.settings,
  );
}

export async function writeAdminSiteSettings(
  input: unknown,
): Promise<SiteSettings> {
  const settings = SiteSettingsSchema.parse(input);

  if (!adminSiteSettingsUsePostgres()) {
    await writeContentJson("site.json", settings);
    return settings;
  }

  return withPostgresTransaction(async (repositories) => {
    const site = await requirePostgresSite(repositories);
    const saved = await repositories.sites.upsertByKey({
      key: site.key,
      settings,
    });
    return saved.settings;
  });
}

export async function mutateAdminSiteSettings(
  mutate: (settings: SiteSettings) => SiteSettings | Promise<SiteSettings>,
): Promise<SiteSettings> {
  if (!adminSiteSettingsUsePostgres()) {
    const current = await readLegacySiteSettings();
    const next = SiteSettingsSchema.parse(await mutate(current));
    await writeContentJson("site.json", next);
    return next;
  }

  return withPostgresTransaction(async (repositories) => {
    const site = await requirePostgresSite(repositories);
    const next = SiteSettingsSchema.parse(await mutate(site.settings));
    const saved = await repositories.sites.upsertByKey({
      key: site.key,
      settings: next,
    });
    return saved.settings;
  });
}

async function legacyPageFiles(): Promise<string[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  return (await listContent("pages"))
    .map((entry) =>
      entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "",
    )
    .filter(
      (file) => Boolean(file) && !file.includes("/") && file.endsWith(".json"),
    )
    .sort();
}

export async function listAdminContentPages(): Promise<AdminContentPage[]> {
  if (adminSiteSettingsUsePostgres()) {
    const repositories = createPostgresRepositories();
    const site = await requirePostgresSite(repositories);
    const pages = await repositories.pages.list(site.id);
    return pages.map((record) => ({ file: record.id, page: record.page }));
  }

  const pages: AdminContentPage[] = [];
  for (const file of await legacyPageFiles()) {
    try {
      const raw = await readContentJson<unknown>(`pages/${file}`);
      if (raw === null) continue;
      const page = PageSchema.parse(raw);
      pages.push({ file, page });
    } catch {
      // Keep legacy admin list behavior resilient to one malformed page.
    }
  }
  return pages;
}

export async function listAdminPageOptions(): Promise<
  Array<{ path: string; title: string }>
> {
  const pages = await listAdminContentPages();
  return pages
    .map(({ page }) => ({ path: page.path, title: page.title }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
