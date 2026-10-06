import type {
  TenantContext,
} from "./tenant-context";

import {
  readAdminSiteSettings,
  listAdminContentPages,
} from "./admin-site-settings";

import {
  listRedirects,
} from "./admin-redirects";

import {
  runSiteHealth,
} from "./admin-site-health";

import {
  listMediaFiles,
} from "./admin-media";

import {
  listBackupTimes,
} from "./admin-backups";

import {
  resolvePublicContentConfig,
} from "./content-source";

import {
  readAdminRecoveryBundle,
  writeAdminRecoveryBundle,
  type AdminRecoveryBundle,
} from "./admin-recovery-store";

const DEFAULT_MAX_AGE_MS =
  60_000;

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

export async function refreshAdminRecoveryBundle(
  tenant: TenantContext,
  maxAgeMs =
    DEFAULT_MAX_AGE_MS,
): Promise<AdminRecoveryBundle> {
  const existing =
    await readAdminRecoveryBundle(
      tenant.siteId,
    );

  if (
    existing &&
    Date.now() -
      Date.parse(
        existing.updatedAt,
      ) <
      maxAgeMs
  ) {
    return existing;
  }

  const [
    siteSettings,
    pages,
    redirects,
    health,
    media,
    backups,
  ] =
    await Promise.all([
      safe(
        readAdminSiteSettings,
        null,
      ),

      safe(
        listAdminContentPages,
        [],
      ),

      safe(
        listRedirects,
        {
          redirects: [],
          issues: [],
        },
      ),

      safe(
        runSiteHealth,
        null,
      ),

      safe(
        () =>
          listMediaFiles(
            tenant.siteId,
          ),
        [],
      ),

      safe(
        () =>
          listBackupTimes(
            5,
          ),
        [],
      ),
    ]);

  const config =
    resolvePublicContentConfig();

  const bundle:
    AdminRecoveryBundle = {
      schema:
        "staark-tenant-recovery/v1",

      version: 1,

      siteId:
        tenant.siteId,

      updatedAt:
        new Date()
          .toISOString(),

      tenant,

      siteSettings,

      redirects: {
        redirects:
          redirects.redirects,

        issues:
          redirects.issues,
      },

      pages: {
        count:
          pages.length,

        items:
          pages.map(
            ({
              file,
              page,
            }) => ({
              file,

              path:
                page.path,

              title:
                page.title,
            }),
          ),
      },

      health,

      media: {
        count:
          media.length,
      },

      backups: {
        items:
          backups,
      },

      runtime: {
        environment:
          process.env.NODE_ENV ===
          "production"
            ? "Production"
            : "Development",

        contentSource:
          config.source,

        nodeVersion:
          process.version,
      },
    };

  await writeAdminRecoveryBundle(
    bundle,
  );

  return bundle;
}
