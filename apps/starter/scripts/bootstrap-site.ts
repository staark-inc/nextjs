import { PageSchema, SiteSettingsSchema } from "@staark/core";

import { disconnectPrismaClient } from "../lib/db/prisma";
import {
  createPostgresRepositories,
  withPostgresTransaction,
} from "../lib/repositories/postgres";

type CliOptions = {
  siteKey: string;
  name: string;
  url: string;
  locale: string;
  theme: string;
  email?: string;
  homeTitle: string;
};

function usage(): string {
  return `Staark Storage v2 greenfield site bootstrap

Usage:
  pnpm db:bootstrap-site -- --site-key <key> --name <name> --url <url> [options]

Required:
  --site-key <key>       Stable Storage v2 site key.
  --name <name>          Client/site name.
  --url <url>            Canonical site URL.

Options:
  --locale <locale>      Site locale. Default: sv-SE
  --theme <family>       Initial theme family. Default: light
  --email <email>        Contact email. Defaults to SiteSettingsSchema default.
  --home-title <title>   Initial homepage title. Default: Home
  -h, --help             Show this help.

This command is intentionally greenfield-only. If the site key already exists,
it aborts without modifying it.
`;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions | null {
  let siteKey = "";
  let name = "";
  let url = "";
  let locale = "sv-SE";
  let theme = "light";
  let email: string | undefined;
  let homeTitle = "Home";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") return null;

    if (
      arg === "--site-key" ||
      arg === "--name" ||
      arg === "--url" ||
      arg === "--locale" ||
      arg === "--theme" ||
      arg === "--email" ||
      arg === "--home-title"
    ) {
      const value = requireValue(argv, index, arg);
      if (arg === "--site-key") siteKey = value;
      if (arg === "--name") name = value;
      if (arg === "--url") url = value;
      if (arg === "--locale") locale = value;
      if (arg === "--theme") theme = value;
      if (arg === "--email") email = value;
      if (arg === "--home-title") homeTitle = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!siteKey.trim()) throw new Error("--site-key is required.");
  if (!name.trim()) throw new Error("--name is required.");
  if (!url.trim()) throw new Error("--url is required.");

  return {
    siteKey: siteKey.trim().toLowerCase(),
    name: name.trim(),
    url: url.trim(),
    locale: locale.trim(),
    theme: theme.trim().toLowerCase(),
    email: email?.trim() || undefined,
    homeTitle: homeTitle.trim(),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    console.log(usage());
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  const settings = SiteSettingsSchema.parse({
    name: options.name,
    locale: options.locale,
    url: options.url,
    theme: { family: options.theme },
    ...(options.email
      ? { contact: { email: options.email, openingHours: [] } }
      : {}),
    navigation: {
      primary: [{ label: options.homeTitle, href: "/" }],
      footer: [],
      footerColumns: [],
    },
    seo: {
      titleTemplate: `%s | ${options.name}`,
    },
  });

  const homepage = PageSchema.parse({
    path: "/",
    title: options.homeTitle,
    seo: { noindex: false },
    blocks: [],
    updatedAt: new Date().toISOString(),
  });

  const existing = await createPostgresRepositories().sites.findByKey(options.siteKey);
  if (existing) {
    throw new Error(
      `Site key "${options.siteKey}" already exists (id=${existing.id}). ` +
        "Bootstrap is greenfield-only and will not overwrite it.",
    );
  }

  const result = await withPostgresTransaction(async (repositories) => {
    const concurrent = await repositories.sites.findByKey(options.siteKey);
    if (concurrent) {
      throw new Error(`Site key "${options.siteKey}" already exists.`);
    }

    const site = await repositories.sites.upsertByKey({
      key: options.siteKey,
      settings,
    });

    const page = await repositories.pages.upsertByPath(site.id, homepage);

    return { site, page };
  });

  console.log("Staark greenfield site created successfully.\n");
  console.log(`Site key:   ${result.site.key}`);
  console.log(`Site id:    ${result.site.id}`);
  console.log(`Name:       ${result.site.settings.name}`);
  console.log(`URL:        ${result.site.settings.url}`);
  console.log(`Theme:      ${result.site.settings.theme.family ?? "(none)"}`);
  console.log(`Homepage:   ${result.page.page.path} (${result.page.id})`);
  console.log("\nNext runtime settings:");
  console.log("  STAARK_DATA_SOURCE=postgres");
  console.log(`  STAARK_SITE_KEY=${result.site.key}`);
  console.log("  STAARK_DATA_FALLBACK=none");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? `ERROR: ${error.message}` : `ERROR: ${String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
