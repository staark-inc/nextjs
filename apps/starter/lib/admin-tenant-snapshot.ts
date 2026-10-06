import {
  getStorage,
} from "@staark/platform/server";

import type {
  TenantContext,
} from "./tenant-context";

const SNAPSHOT_PATH =
  ".staark/recovery/tenant-contexts.json";

type TenantRecoveryRecord = {
  tenant: TenantContext;
  updatedAt: string;
};

type TenantRecoverySnapshot = {
  version: 1;

  hosts: Record<
    string,
    TenantRecoveryRecord
  >;
};

let writeLock:
  Promise<void> =
  Promise.resolve();

function normalizeHost(
  value: string | null | undefined,
): string {
  return (
    value
      ?.trim()
      .toLowerCase() ??
    ""
  );
}

function emptySnapshot():
TenantRecoverySnapshot {
  return {
    version: 1,
    hosts: {},
  };
}

async function readSnapshot():
Promise<TenantRecoverySnapshot> {
  try {
    const raw =
      await getStorage()
        .readText(
          SNAPSHOT_PATH,
        );

    if (!raw) {
      return emptySnapshot();
    }

    const parsed =
      JSON.parse(raw) as
        Partial<TenantRecoverySnapshot>;

    if (
      parsed.version !== 1 ||
      !parsed.hosts ||
      typeof parsed.hosts !==
        "object"
    ) {
      return emptySnapshot();
    }

    return {
      version: 1,
      hosts:
        parsed.hosts,
    };
  } catch {
    return emptySnapshot();
  }
}

async function withWriteLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let release:
    (() => void) | undefined;

  const previous =
    writeLock;

  writeLock =
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

export async function rememberAdminTenantSnapshot(
  tenant: TenantContext,
  hostnames:
    readonly (
      string |
      null |
      undefined
    )[],
): Promise<void> {
  const hosts =
    Array.from(
      new Set(
        [
          tenant.hostname,
          ...hostnames,
        ]
          .map(normalizeHost)
          .filter(Boolean),
      ),
    );

  if (!hosts.length) {
    return;
  }

  await withWriteLock(
    async () => {
      const snapshot =
        await readSnapshot();

      const updatedAt =
        new Date()
          .toISOString();

      for (
        const hostname
        of hosts
      ) {
        snapshot.hosts[
          hostname
        ] = {
          tenant: {
            ...tenant,
            hostname,
          },
          updatedAt,
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
         * Recovery snapshots are best effort.
         * Storage failure must never break
         * healthy tenant requests.
         */
      }
    },
  );
}

export async function readAdminTenantSnapshot(
  hostname:
    string |
    null |
    undefined,
): Promise<{
  tenant: TenantContext;
  updatedAt: string;
} | null> {
  const normalized =
    normalizeHost(
      hostname,
    );

  if (!normalized) {
    return null;
  }

  const snapshot =
    await readSnapshot();

  const record =
    snapshot.hosts[
      normalized
    ];

  if (
    !record?.tenant?.siteId ||
    !record.tenant.siteKey
  ) {
    return null;
  }

  return {
    tenant: {
      ...record.tenant,
      hostname:
        normalized,
    },

    updatedAt:
      record.updatedAt,
  };
}
