import {
  getStorage,
} from "@staark/platform/server";

import type {
  TenantContext,
} from "./tenant-context";

export const ADMIN_RECOVERY_SCHEMA =
  "staark-tenant-recovery/v1" as const;

export type AdminRecoveryBundle = {
  schema:
    typeof ADMIN_RECOVERY_SCHEMA;

  version: 1;

  siteId: string;

  updatedAt: string;

  tenant: TenantContext;

  siteSettings:
    unknown | null;

  redirects: {
    redirects: unknown[];
    issues: unknown[];
  };

  pages: {
    count: number;

    items: Array<{
      file: string;
      path: string;
      title: string;
    }>;
  };

  health:
    unknown | null;

  media: {
    count: number;
  };

  backups: {
    items: Array<{
      id: string;
      createdAt: string;
    }>;
  };

  runtime: {
    environment: string;
    contentSource: string;
    nodeVersion: string;
  };
};

function validSiteId(
  value: string,
): boolean {
  return (
    /^[0-9a-f-]{36}$/i.test(
      value.trim(),
    )
  );
}

function bundlePath(
  siteId: string,
): string {
  if (!validSiteId(siteId)) {
    throw new Error(
      "Invalid recovery bundle siteId.",
    );
  }

  return (
    `.staark/recovery/tenants/` +
    `${siteId}.json`
  );
}

export async function readAdminRecoveryBundle(
  siteId: string,
): Promise<AdminRecoveryBundle | null> {
  try {
    const raw =
      await getStorage()
        .readText(
          bundlePath(siteId),
        );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as
        Partial<AdminRecoveryBundle>;

    if (
      parsed.schema !==
        ADMIN_RECOVERY_SCHEMA ||
      parsed.version !== 1 ||
      parsed.siteId !== siteId ||
      !parsed.tenant
    ) {
      return null;
    }

    return (
      parsed as
        AdminRecoveryBundle
    );
  } catch {
    /*
     * Recovery data must never make
     * Admin unusable.
     */
    return null;
  }
}

export async function writeAdminRecoveryBundle(
  bundle: AdminRecoveryBundle,
): Promise<void> {
  try {
    await getStorage()
      .write(
        bundlePath(
          bundle.siteId,
        ),

        `${JSON.stringify(
          bundle,
          null,
          2,
        )}\n`,
      );
  } catch {
    /*
     * Snapshot persistence is best effort.
     * Healthy production traffic must not
     * fail because recovery storage failed.
     */
  }
}
