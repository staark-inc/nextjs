import type {
  StaarkStorage,
} from "@staark/core/storage";

import {
  getStorage,
} from "@staark/core/storage";

import type {
  StaarkLogEntry,
  StaarkLogLevel,
  StaarkLogSource,
} from "./types.ts";

import {
  DEFAULT_LOG_MAX_ENTRIES_PER_DAY,
  DEFAULT_LOG_RETENTION_DAYS,
  DEFAULT_LOG_STORE_PREFIX,
  type StaarkLogStore,
  type StaarkLogStoreCleanupResult,
  type StaarkLogStoreQuery,
  type StaarkLogStoreStats,
  type StaarkLogStoreWriteResult,
} from "./store-types.ts";

export type StorageLogStoreOptions = {
  storage?: StaarkStorage;

  /**
   * Prefix relative to the configured Staark storage root.
   *
   * Default:
   *   .staark/logs
   */
  prefix?: string;

  /**
   * Number of UTC calendar days to retain.
   *
   * Default: 30
   */
  retentionDays?: number;

  /**
   * Safety limit for one daily JSONL object.
   *
   * When exceeded, the newest entries are retained.
   *
   * Default: 20,000
   */
  maxEntriesPerDay?: number;

  now?: () => Date;
};

type ParsedLogFile = {
  entries: StaarkLogEntry[];
  malformedLines: number;
};

const LOG_FILE_PATTERN =
  /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

const LEVELS =
  new Set<StaarkLogLevel>([
    "debug",
    "info",
    "warning",
    "error",
    "critical",
  ]);

const SOURCES =
  new Set<StaarkLogSource>([
    "runtime",
    "admin",
    "api",
    "storage",
    "database",
    "auth",
    "billing",
    "theme",
    "deployment",
    "integration",
    "system",
  ]);

/**
 * The generic Staark storage contract exposes object replacement,
 * not append/compare-and-swap.
 *
 * This lock prevents read/modify/write races inside this runtime
 * process while keeping the store compatible with FS, MinIO, S3
 * and R2.
 */
let storeLock:
  Promise<void> =
  Promise.resolve();

async function withStoreLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let release:
    (() => void) | undefined;

  const previous =
    storeLock;

  storeLock =
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

function normalizePrefix(
  value: string | undefined,
): string {
  const prefix =
    value?.trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "") ||
    DEFAULT_LOG_STORE_PREFIX;

  if (
    !prefix ||
    prefix
      .split("/")
      .some(
        (part) =>
          part === "..",
      )
  ) {
    throw new Error(
      "Invalid log storage prefix.",
    );
  }

  return prefix;
}

function validDate(
  value: unknown,
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  const parsed =
    new Date(value);

  return !Number.isNaN(
    parsed.getTime(),
  );
}

function isLogEntry(
  value: unknown,
): value is StaarkLogEntry {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const item =
    value as Partial<StaarkLogEntry>;

  return (
    item.schemaVersion === 1 &&
    typeof item.id === "string" &&
    Boolean(item.id.trim()) &&
    validDate(item.timestamp) &&
    typeof item.level === "string" &&
    LEVELS.has(
      item.level as StaarkLogLevel,
    ) &&
    typeof item.source === "string" &&
    SOURCES.has(
      item.source as StaarkLogSource,
    ) &&
    typeof item.event === "string" &&
    typeof item.message === "string"
  );
}

function parseLogFile(
  raw: string | null,
): ParsedLogFile {
  if (!raw?.trim()) {
    return {
      entries: [],
      malformedLines: 0,
    };
  }

  const entries:
    StaarkLogEntry[] = [];

  let malformedLines = 0;

  for (
    const line of raw.split("\n")
  ) {
    if (!line.trim()) {
      continue;
    }

    try {
      const parsed: unknown =
        JSON.parse(line);

      if (!isLogEntry(parsed)) {
        malformedLines += 1;
        continue;
      }

      entries.push(parsed);
    } catch {
      /*
       * One corrupt JSONL line must never make the
       * whole recorder unreadable.
       */
      malformedLines += 1;
    }
  }

  return {
    entries,
    malformedLines,
  };
}

function serializeLogFile(
  entries:
    readonly StaarkLogEntry[],
): string {
  if (!entries.length) {
    return "";
  }

  return `${
    entries
      .map(
        (entry) =>
          JSON.stringify(entry),
      )
      .join("\n")
  }\n`;
}

function dateKey(
  value: Date | string,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      "Invalid log timestamp.",
    );
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function parseBoundary(
  value:
    | Date
    | string
    | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const time =
    date.getTime();

  if (
    Number.isNaN(time)
  ) {
    return null;
  }

  return time;
}

function compareNewestFirst(
  a: StaarkLogEntry,
  b: StaarkLogEntry,
): number {
  const time =
    new Date(
      b.timestamp,
    ).getTime() -
    new Date(
      a.timestamp,
    ).getTime();

  if (time !== 0) {
    return time;
  }

  return b.id.localeCompare(
    a.id,
  );
}

function matchesQuery(
  entry: StaarkLogEntry,
  query: StaarkLogStoreQuery,
): boolean {
  if (
    query.levels?.length &&
    !query.levels.includes(
      entry.level,
    )
  ) {
    return false;
  }

  if (
    query.sources?.length &&
    !query.sources.includes(
      entry.source,
    )
  ) {
    return false;
  }

  const timestamp =
    new Date(
      entry.timestamp,
    ).getTime();

  const from =
    parseBoundary(
      query.from,
    );

  const to =
    parseBoundary(
      query.to,
    );

  if (
    from !== null &&
    timestamp < from
  ) {
    return false;
  }

  if (
    to !== null &&
    timestamp > to
  ) {
    return false;
  }

  const search =
    query.search
      ?.trim()
      .toLowerCase();

  if (search) {
    const haystack = [
      entry.id,
      entry.level,
      entry.source,
      entry.event,
      entry.message,
      entry.siteId ?? "",
      entry.organizationId ?? "",
      entry.actor?.type ?? "",
      entry.actor?.id ?? "",
      entry.actor?.email ?? "",
      entry.request?.method ?? "",
      entry.request?.path ?? "",
    ]
      .join(" ")
      .toLowerCase();

    if (
      !haystack.includes(
        search,
      )
    ) {
      return false;
    }
  }

  return true;
}

function utcDayStart(
  value: Date,
): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}

function retentionCutoffKey(
  now: Date,
  retentionDays: number,
): string {
  const cutoff =
    utcDayStart(now);

  /*
   * retentionDays=30 means today + previous
   * 29 UTC calendar days are retained.
   */
  cutoff.setUTCDate(
    cutoff.getUTCDate() -
      (retentionDays - 1),
  );

  return dateKey(cutoff);
}

function logFileDateFromPath(
  path: string,
): string | null {
  const name =
    path.split("/").at(-1);

  if (!name) {
    return null;
  }

  const match =
    LOG_FILE_PATTERN.exec(
      name,
    );

  return match?.[1] ?? null;
}

export function createStorageLogStore(
  options:
    StorageLogStoreOptions = {},
): StaarkLogStore {
  const storage =
    options.storage ??
    getStorage();

  const prefix =
    normalizePrefix(
      options.prefix,
    );

  const retentionDays =
    Math.max(
      1,
      Math.min(
        options.retentionDays ??
          DEFAULT_LOG_RETENTION_DAYS,
        365,
      ),
    );

  const maxEntriesPerDay =
    Math.max(
      100,
      Math.min(
        options.maxEntriesPerDay ??
          DEFAULT_LOG_MAX_ENTRIES_PER_DAY,
        100_000,
      ),
    );

  const now =
    options.now ??
    (() => new Date());

  function pathForEntry(
    entry: StaarkLogEntry,
  ): string {
    return `${prefix}/${dateKey(
      entry.timestamp,
    )}.jsonl`;
  }

  async function listLogPaths():
    Promise<string[]> {
    const objects =
      await storage.list(
        prefix,
      );

    return objects
      .map(
        (item) =>
          item.path,
      )
      .filter(
        (path) =>
          logFileDateFromPath(
            path,
          ) !== null,
      )
      .sort();
  }

  async function cleanupUnlocked():
    Promise<StaarkLogStoreCleanupResult> {
    const cutoff =
      retentionCutoffKey(
        now(),
        retentionDays,
      );

    const paths =
      await listLogPaths();

    const deletedPaths:
      string[] = [];

    for (
      const path of paths
    ) {
      const day =
        logFileDateFromPath(
          path,
        );

      if (
        day &&
        day < cutoff
      ) {
        await storage.delete(
          path,
        );

        deletedPaths.push(
          path,
        );
      }
    }

    return {
      deletedFiles:
        deletedPaths.length,

      deletedPaths,
    };
  }

  return {
    async append(
      entry,
    ): Promise<StaarkLogStoreWriteResult> {
      if (!isLogEntry(entry)) {
        throw new Error(
          "Invalid Staark log entry.",
        );
      }

      return withStoreLock(
        async () => {
          const path =
            pathForEntry(
              entry,
            );

          const parsed =
            parseLogFile(
              await storage.readText(
                path,
              ),
            );

          /*
           * Retries are idempotent. The log ID is the
           * stable event identity across delivery attempts.
           */
          if (
            parsed.entries.some(
              (item) =>
                item.id ===
                entry.id,
            )
          ) {
            return {
              stored: false,
              duplicate: true,
              path,
            };
          }

          const next = [
            ...parsed.entries,
            entry,
          ]
            .sort(
              (
                a,
                b,
              ) =>
                new Date(
                  a.timestamp,
                ).getTime() -
                new Date(
                  b.timestamp,
                ).getTime(),
            )
            .slice(
              -maxEntriesPerDay,
            );

          await storage.write(
            path,
            serializeLogFile(
              next,
            ),
          );

          /*
           * Retention happens after a successful write.
           * Failure to clean old history must not invalidate
           * the event that was already persisted.
           */
          try {
            await cleanupUnlocked();
          } catch {
            // Best-effort retention.
          }

          return {
            stored: true,
            duplicate: false,
            path,
          };
        },
      );
    },

    async list(
      query = {},
    ) {
      const limit =
        Math.max(
          1,
          Math.min(
            query.limit ??
              250,
            5_000,
          ),
        );

      const paths =
        (
          await listLogPaths()
        ).reverse();

      const entries:
        StaarkLogEntry[] = [];

      for (
        const path of paths
      ) {
        const parsed =
          parseLogFile(
            await storage.readText(
              path,
            ),
          );

        for (
          const entry of parsed.entries
        ) {
          if (
            matchesQuery(
              entry,
              query,
            )
          ) {
            entries.push(
              entry,
            );
          }
        }

        /*
         * Files are traversed newest-day first.
         * Keep some headroom for ordering inside a day.
         */
        if (
          entries.length >=
          limit * 2
        ) {
          break;
        }
      }

      return entries
        .sort(
          compareNewestFirst,
        )
        .slice(
          0,
          limit,
        );
    },

    async stats(
      query = {},
    ) {
      const result:
        StaarkLogStoreStats = {
          files: 0,
          entries: 0,

          debug: 0,
          info: 0,
          warning: 0,
          error: 0,
          critical: 0,

          malformedLines: 0,

          oldestTimestamp:
            null,

          newestTimestamp:
            null,
        };

      const paths =
        await listLogPaths();

      const from =
        parseBoundary(
          query.from,
        );

      const to =
        parseBoundary(
          query.to,
        );

      for (
        const path of paths
      ) {
        const parsed =
          parseLogFile(
            await storage.readText(
              path,
            ),
          );

        result.files += 1;
        result.malformedLines +=
          parsed.malformedLines;

        for (
          const entry of parsed.entries
        ) {
          const timestamp =
            new Date(
              entry.timestamp,
            ).getTime();

          if (
            from !== null &&
            timestamp < from
          ) {
            continue;
          }

          if (
            to !== null &&
            timestamp > to
          ) {
            continue;
          }

          result.entries += 1;

          result[
            entry.level
          ] += 1;

          if (
            !result.oldestTimestamp ||
            entry.timestamp <
              result.oldestTimestamp
          ) {
            result.oldestTimestamp =
              entry.timestamp;
          }

          if (
            !result.newestTimestamp ||
            entry.timestamp >
              result.newestTimestamp
          ) {
            result.newestTimestamp =
              entry.timestamp;
          }
        }
      }

      return result;
    },

    async cleanup() {
      return withStoreLock(
        async () =>
          cleanupUnlocked(),
      );
    },

    async clear() {
      await withStoreLock(
        async () => {
          const paths =
            await listLogPaths();

          for (
            const path of paths
          ) {
            await storage.delete(
              path,
            );
          }
        },
      );
    },
  };
}
