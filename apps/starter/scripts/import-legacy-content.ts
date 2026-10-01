import path from "node:path";

import { disconnectPrismaClient } from "../lib/db/prisma";
import {
  applyLegacyContentImport,
  loadLegacyContent,
  planLegacyContentImport,
  type LegacyImportPlan,
} from "../lib/importers/legacy-content";
import {
  createPostgresRepositories,
  withPostgresTransaction,
} from "../lib/repositories/postgres";

type CliOptions = {
  source: string;
  siteKey: string;
  write: boolean;
  includeRevisions: boolean;
};

function usage(): string {
  return `Staark Storage v2 legacy JSON importer

Usage:
  pnpm db:import:legacy -- --source <path> --site-key <key> [--write] [--skip-revisions]

Options:
  --source <path>       Storage root containing content/site.json, or a content dir.
  --site-key <key>      Stable PostgreSQL tenant/import key. Required.
  --write               Apply the plan transactionally. Without this flag: dry-run.
  --dry-run             Explicit dry-run (the default).
  --skip-revisions      Do not inspect/import .staark/revisions/pages history.
  -h, --help            Show this help.

Examples:
  pnpm db:import:legacy -- --source ../../themes/kreator/demo --site-key kreator-demo
  pnpm db:import:legacy -- --source ../../themes/kreator/demo --site-key kreator-demo --write
  pnpm db:import:legacy -- --source /data --site-key customer-slug
`;
}

function parseArgs(argv: string[]): CliOptions | null {
  let source = "";
  let siteKey = "";
  let write = false;
  let explicitDryRun = false;
  let includeRevisions = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") return null;
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--dry-run") {
      explicitDryRun = true;
      continue;
    }
    if (arg === "--skip-revisions") {
      includeRevisions = false;
      continue;
    }
    if (arg === "--source" || arg === "--site-key") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      if (arg === "--source") source = value;
      if (arg === "--site-key") siteKey = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (write && explicitDryRun) {
    throw new Error("Choose either --write or --dry-run, not both.");
  }
  if (!source) throw new Error("--source is required.");
  if (!siteKey) throw new Error("--site-key is required.");

  return { source, siteKey, write, includeRevisions };
}

function icon(action: string): string {
  switch (action) {
    case "create": return "+";
    case "update": return "~";
    case "reactivate": return "↻";
    case "unchanged": return "=";
    default: return "?";
  }
}

function printPlan(plan: LegacyImportPlan): void {
  console.log(`Site: ${icon(plan.site.action)} ${plan.site.action.toUpperCase()} (${plan.siteKey})`);
  console.log("Pages:");
  for (const page of plan.pages) {
    console.log(`  ${icon(page.action)} ${page.action.padEnd(10)} ${page.file} -> ${page.path}`);
  }

  if (plan.revisions.length > 0) {
    console.log("Revisions:");
    for (const revision of plan.revisions) {
      console.log(
        `  ${icon(revision.action)} ${revision.action.padEnd(10)} ${revision.file} ` +
          `${revision.createdAt} ${revision.checksum.slice(0, 12)}…`,
      );
    }
  } else {
    console.log("Revisions: none found/imported.");
  }

  if (plan.untouchedDatabasePages.length > 0) {
    console.log("Database-only pages (left untouched; importer never prunes):");
    for (const page of plan.untouchedDatabasePages) {
      console.log(`  ! ${page.path}${page.deletedAt ? " [soft-deleted]" : ""}`);
    }
  }

  if (plan.blockingIssues.length > 0) {
    console.log("BLOCKING ISSUES:");
    for (const issue of plan.blockingIssues) console.log(`  ! ${issue}`);
  }

  console.log(
    "Summary: " +
      `pages +${plan.summary.pagesCreate} ~${plan.summary.pagesUpdate} ` +
      `↻${plan.summary.pagesReactivate} =${plan.summary.pagesUnchanged}; ` +
      `revisions +${plan.summary.revisionsCreate} =${plan.summary.revisionsUnchanged}`,
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    console.log(usage());
    return;
  }

  const bundle = await loadLegacyContent(options.source, {
    includeRevisions: options.includeRevisions,
  });

  console.log("Staark Storage v2 — legacy JSON → PostgreSQL");
  console.log(`Mode: ${options.write ? "WRITE" : "DRY RUN (zero writes)"}`);
  console.log(`Source: ${path.resolve(options.source)}`);
  console.log(`Content: ${bundle.contentRoot}`);
  console.log(`Pages found: ${bundle.pages.length}`);
  console.log(`Revisions found: ${bundle.revisions.length}`);
  console.log("");

  if (!options.write) {
    const plan = await planLegacyContentImport(
      bundle,
      options.siteKey,
      createPostgresRepositories(),
    );
    printPlan(plan);
    console.log("");
    console.log("Dry-run complete. No database writes were performed.");
    if (plan.blockingIssues.length === 0) {
      console.log("Re-run the same command with --write to apply this plan transactionally.");
    } else {
      process.exitCode = 2;
    }
    return;
  }

  const result = await withPostgresTransaction(async (repositories) => {
    const plan = await planLegacyContentImport(bundle, options.siteKey, repositories);
    printPlan(plan);
    if (plan.blockingIssues.length > 0) {
      throw new Error("Import has blocking issues; transaction was not applied.");
    }
    return applyLegacyContentImport(bundle, options.siteKey, repositories);
  });

  console.log("");
  console.log(
    `Import committed for site ${result.siteId}: ` +
      `${result.pagesWritten} page write(s), ${result.revisionsWritten} revision write(s).`,
  );
  console.log("Legacy files were not modified or deleted.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
