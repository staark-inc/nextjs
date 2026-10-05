import {
  headers,
} from "next/headers";

import {
  getStorage,
} from "@staark/platform/server";

import {
  resolvePublicContentConfig,
} from "./content-source";

import {
  resolveAdminTenantContext,
} from "./admin-tenant";

import {
  resolveRequestHostname,
} from "./tenant-context";

const SNAPSHOT_PATH =
  ".staark/recovery/tenant-log-scopes.json";

const DEFAULT_PREFIX =
  ".staark/logs";

type TenantLogScopeSnapshot = {
  version: 1;

  hosts: Record<
    string,
    {
      siteId: string;
      updatedAt: string;
    }
  >;
};

export type AdminLogScope = {
  siteId: string | null;
  hostname: string | null;

  prefix: string;

  resolvedBy:
    | "database"
    | "snapshot"
    | "legacy";
};

let snapshotLock:
  Promise<void> =
  Promise.resolve();

async function withSnapshotLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let release:
    (() => void) | undefined;

  const previous =
    snapshotLock;

  snapshotLock =
    new Promise<void>(
      (resolve) => {
        release = resolve;
      },
    );

  await previous;

  try {
    return await operation();
  } finally {
    release?.();
  }
}

function validSiteId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f-]{36}$/i.test(
      value.trim(),
    )
  );
}

function emptySnapshot():
  TenantLogScopeSnapshot {
  return {
    version: 1,
    hosts: {},
  };
}

async function readSnapshot():
  Promise<TenantLogScopeSnapshot> {
  try {
    const raw =
      await getStorage()
        .readText(
          SNAPSHOT_PATH,
        );

    if (!raw) {
      return emptySnapshot();
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return emptySnapshot();
    }

    const object =
      parsed as {
        version?: unknown;
        hosts?: unknown;
      };

    if (
      object.version !== 1 ||
      !object.hosts ||
      typeof object.hosts !==
        "object" ||
      Array.isArray(object.hosts)
    ) {
      return emptySnapshot();
    }

    const hosts:
      TenantLogScopeSnapshot["hosts"] =
      {};

    for (
      const [
        hostname,
        value,
      ] of Object.entries(
        object.hosts,
      )
    ) {
      if (
        !value ||
        typeof value !==
          "object" ||
        Array.isArray(value)
      ) {
        continue;
      }

      const record =
        value as {
          siteId?: unknown;
          updatedAt?: unknown;
        };

      if (
        !validSiteId(
          record.siteId,
        )
      ) {
        continue;
      }

      hosts[
        hostname.toLowerCase()
      ] = {
        siteId:
          record.siteId,

        updatedAt:
          typeof record.updatedAt ===
            "string"
            ? record.updatedAt
            : "",
      };
    }

    return {
      version: 1,
      hosts,
    };
  } catch {
    /*
     * Recovery metadata must never make
     * the logs page unusable.
     */
    return emptySnapshot();
  }
}

async function rememberScope(
  hostnames:
    readonly string[],
  siteId: string,
): Promise<void> {
  const normalized =
    Array.from(
      new Set(
        hostnames
          .map(
            (hostname) =>
              hostname
                .trim()
                .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );

  if (
    !normalized.length ||
    !validSiteId(siteId)
  ) {
    return;
  }

  await withSnapshotLock(
    async () => {
      const snapshot =
        await readSnapshot();

      const now =
        new Date()
          .toISOString();

      for (
        const hostname of normalized
      ) {
        snapshot.hosts[
          hostname
        ] = {
          siteId,
          updatedAt: now,
        };
      }

      try {
        await getStorage()
          .write(
            SNAPSHOT_PATH,
            `${JSON.stringify(
              snapshot,
              null,
              2,
            )}\n`,
          );
      } catch {
        /*
         * Snapshot is a recovery optimization.
         * Failure to persist it must not break
         * normal admin operations.
         */
      }
    },
  );
}

async function requestHostname():
  Promise<string | null> {
  try {
    const requestHeaders =
      await headers();

    const hostname =
      resolveRequestHostname(
        {
          host:
            requestHeaders.get(
              "host",
            ),

          forwardedHost:
            requestHeaders.get(
              "x-forwarded-host",
            ),
        },
      );

    return (
      hostname
        ?.trim()
        .toLowerCase() ||
      null
    );
  } catch {
    return null;
  }
}

function tenantPrefix(
  siteId: string,
): string {
  return (
    `sites/${siteId}` +
    `/.staark/logs`
  );
}

export async function resolveAdminLogScope():
  Promise<AdminLogScope> {
  const config =
    resolvePublicContentConfig();

  /*
   * Legacy / fixture installs retain the
   * original global local-admin path.
   */
  if (
    config.source !==
    "postgres"
  ) {
    return {
      siteId: null,
      hostname: null,
      prefix:
        DEFAULT_PREFIX,
      resolvedBy:
        "legacy",
    };
  }

  const hostname =
    await requestHostname();

  /*
   * Healthy production path:
   *
   * Host -> PostgreSQL tenant -> siteId
   *
   * Every successful resolution refreshes
   * the recovery snapshot.
   */
  try {
    const tenant =
      await resolveAdminTenantContext();

    if (tenant) {
      await rememberScope(
        [
          hostname ?? "",
          tenant.hostname,
        ],
        tenant.siteId,
      );

      return {
        siteId:
          tenant.siteId,

        hostname:
          hostname ??
          tenant.hostname ??
          null,

        prefix:
          tenantPrefix(
            tenant.siteId,
          ),

        resolvedBy:
          "database",
      };
    }
  } catch {
    /*
     * PostgreSQL may be unavailable.
     * Continue into recovery snapshot lookup.
     */
  }

  /*
   * Recovery path:
   *
   * Host -> persistent snapshot -> siteId
   *
   * This does not touch Prisma.
   */
  if (hostname) {
    const snapshot =
      await readSnapshot();

    const record =
      snapshot.hosts[
        hostname
      ];

    if (
      record &&
      validSiteId(
        record.siteId,
      )
    ) {
      return {
        siteId:
          record.siteId,

        hostname,

        prefix:
          tenantPrefix(
            record.siteId,
          ),

        resolvedBy:
          "snapshot",
      };
    }
  }

  throw new Error(
    "Could not resolve tenant log storage. " +
    "PostgreSQL is unavailable and no recovery log-scope snapshot exists for this hostname.",
  );
}
