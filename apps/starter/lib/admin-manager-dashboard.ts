import { listBackupTimes } from "./admin-backups";
import { listMediaFiles } from "./admin-media";
import { listRedirects } from "./admin-redirects";
import { runSiteHealth } from "./admin-site-health";
import {
  contentStoragePath,
  contentStoragePrefix,
  listContent,
  readContentJson,
} from "./storage";

type ManagerSite = {
  name?: string;
  url?: string;
  websiteType?: unknown;
  theme?: {
    family?: string;
    preset?: string;
    studio?: {
      id?: string;
      name?: string;
    };
  };
};

export type ManagerHealthStatus =
  | "ok"
  | "warning"
  | "error"
  | "unknown";

export type ManagerDashboardData = {
  site: {
    name: string;
    url: string;
    websiteType: string;
  };

  health: {
    status: ManagerHealthStatus;
    errors: number;
    warnings: number;
    passed: number;
    checks: number;
    checkedAt: string | null;

    items: Array<{
      id: string;
      label: string;
      status: "ok" | "warning" | "error";
      issues: number;
    }>;
  };

  content: {
    pages: number;
    media: number;
    redirects: number;
  };

  theme: {
    family: string;
    preset: string;
    studioId: string;
    studioName: string;
  };

  deployment: {
    environment: string;
    source: string;
    contentPrefix: string;
    nodeVersion: string;
    uptimeSeconds: number;
  };

  backup: {
    lastAt: string | null;
  };

  generatedAt: string;
};

async function safe<T>(
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

function pageCount(
  entries: Awaited<ReturnType<typeof listContent>>,
): number {
  const prefix = `${contentStoragePath("pages")}/`;

  return entries.filter((entry) => {
    if (!entry.path.startsWith(prefix)) return false;

    const relative = entry.path.slice(prefix.length);

    return (
      Boolean(relative) &&
      !relative.includes("/") &&
      relative.endsWith(".json")
    );
  }).length;
}

function deploymentSource(): string {
  const explicit =
    process.env.STAARK_CONTENT_SOURCE?.trim();

  if (explicit) return explicit;

  if (
    process.env.STAARK_SITE_ID?.trim() &&
    process.env.STAARK_SITE_SECRET?.trim()
  ) {
    return "hub";
  }

  return "local";
}

export async function loadManagerDashboard():
Promise<ManagerDashboardData> {
  const [
    site,
    health,
    pageEntries,
    media,
    redirects,
    backups,
  ] = await Promise.all([
    safe(
      () =>
        readContentJson<ManagerSite>(
          "site.json",
        ),
      null,
    ),

    safe(runSiteHealth, null),

    safe(
      () => listContent("pages"),
      [],
    ),

    safe(listMediaFiles, []),

    safe(listRedirects, {
      redirects: [],
      issues: [],
    }),

    safe(
      () => listBackupTimes(1),
      [],
    ),
  ]);

  const healthStatus: ManagerHealthStatus =
    !health
      ? "unknown"
      : health.counts.errors > 0
        ? "error"
        : health.counts.warnings > 0
          ? "warning"
          : "ok";

  const family =
    process.env.STAARK_THEME?.trim() ||
    site?.theme?.family?.trim() ||
    "default";

  return {
    site: {
      name:
        site?.name?.trim() ||
        "Staark website",

      url:
        site?.url?.trim() ||
        "",

      websiteType:
        typeof site?.websiteType === "string"
          ? site.websiteType
          : "business",
    },

    health: {
      status: healthStatus,

      errors:
        health?.counts.errors ?? 0,

      warnings:
        health?.counts.warnings ?? 0,

      passed:
        health?.counts.passed ?? 0,

      checks:
        health?.counts.checks ?? 0,

      checkedAt:
        health?.checkedAt ?? null,

      items:
        health?.checks.map((check) => ({
          id: check.id,
          label: check.label,
          status: check.status,
          issues: check.issues,
        })) ?? [],
    },

    content: {
      pages: pageCount(pageEntries),
      media: media.length,
      redirects: redirects.redirects.length,
    },

    theme: {
      family,

      preset:
        site?.theme?.preset?.trim() ||
        "default",

      studioId:
        site?.theme?.studio?.id?.trim() ||
        "",

      studioName:
        site?.theme?.studio?.name?.trim() ||
        "",
    },

    deployment: {
      environment:
        process.env.NODE_ENV ===
        "production"
          ? "Production"
          : "Development",

      source: deploymentSource(),

      contentPrefix:
        contentStoragePrefix(),

      nodeVersion:
        process.version,

      uptimeSeconds:
        Math.floor(process.uptime()),
    },

    backup: {
      lastAt:
        backups[0]?.createdAt ?? null,
    },

    generatedAt:
      new Date().toISOString(),
  };
}
