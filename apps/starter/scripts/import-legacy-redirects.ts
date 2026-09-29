import {
  getStorage,
  normalizeStoragePath,
  readJson,
} from "@staark/core/storage";
import {
  inspectRedirects,
  sanitizeRedirectRule,
  type RedirectRule,
} from "../lib/redirect-domain";
import {
  createPostgresRepositories,
  withPostgresTransaction,
} from "../lib/repositories";
import { disconnectPrismaClient } from "../lib/db/prisma";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const write = process.argv.includes("--write");
const siteKey = (arg("--site-key") ?? process.env.STAARK_SITE_KEY ?? "")
  .trim()
  .toLowerCase();

if (!siteKey) {
  throw new Error("Pass --site-key <key> or set STAARK_SITE_KEY.");
}

type LegacyDocument = {
  schema?: unknown;
  version?: unknown;
  redirects?: unknown;
};

function comparable(rule: RedirectRule) {
  return {
    from: rule.from,
    to: rule.to,
    status: rule.status,
    enabled: rule.enabled,
    source: rule.source,
  };
}

async function main() {
  const raw = await readJson<LegacyDocument>(
    getStorage(),
    normalizeStoragePath(".staark/redirects.json"),
  );
  const legacyRules: RedirectRule[] = [];

  if (raw) {
    if (
      raw.schema !== "staark-redirects/v1" ||
      raw.version !== 1 ||
      !Array.isArray(raw.redirects)
    ) {
      throw new Error("Unsupported .staark/redirects.json format.");
    }
    for (const item of raw.redirects) {
      legacyRules.push(sanitizeRedirectRule(item as Partial<RedirectRule>));
    }
  }

  const problems = inspectRedirects(legacyRules).filter(
    (issue) => issue.severity === "error",
  );
  if (problems.length) throw new Error(problems[0]!.message);

  const repositories = createPostgresRepositories();
  const site = await repositories.sites.findByKey(siteKey);
  if (!site) throw new Error(`No PostgreSQL Site exists for site key "${siteKey}".`);

  const pages = await repositories.pages.list(site.id);
  const activePaths = new Set(pages.map((page) => page.page.path));
  for (const rule of legacyRules) {
    if (activePaths.has(rule.from)) {
      throw new Error(
        `Legacy redirect ${rule.from} conflicts with an active PostgreSQL page. Resolve it before import.`,
      );
    }
  }

  const existing = await repositories.redirects.list(site.id);
  const byFrom = new Map(existing.map((rule) => [rule.from, rule]));
  let creates = 0;
  let updates = 0;
  let unchanged = 0;

  console.log("Staark Storage v2 — legacy redirects → PostgreSQL");
  console.log(`Mode: ${write ? "WRITE" : "DRY RUN (zero writes)"}`);
  console.log(`Site: ${siteKey}`);
  console.log(`Legacy rules found: ${legacyRules.length}`);

  for (const rule of legacyRules) {
    const current = byFrom.get(rule.from);
    if (!current) {
      creates += 1;
      console.log(`  + create     ${rule.from} -> ${rule.to} (${rule.status})`);
    } else if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(rule))) {
      updates += 1;
      console.log(`  ~ update     ${rule.from} -> ${rule.to} (${rule.status})`);
    } else {
      unchanged += 1;
      console.log(`  = unchanged  ${rule.from} -> ${rule.to}`);
    }
  }

  console.log(`Summary: +${creates} ~${updates} =${unchanged}`);

  if (!write) {
    console.log("Dry-run complete. No database writes were performed.");
    console.log("Re-run with --write to apply this plan transactionally.");
    return;
  }

  await withPostgresTransaction(async (tx) => {
    for (const rule of legacyRules) {
      await tx.redirects.upsertByFrom({ siteId: site.id, ...rule });
    }
  });

  console.log("Write complete. Legacy redirect storage was not deleted or modified.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
