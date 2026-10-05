import {
  createStaarkLogger,
  createStorageLogSink,
  createStorageLogStore,
  type StaarkLogLevel,
  type StaarkLogMetaValue,
} from "@staark/logs/server";

export type AdminLogLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

export type AdminLogEntry = {
  id: string;
  at: string;
  level: AdminLogLevel;
  area: string;
  action: string;
  message: string;
  actor: string;
  meta?: Record<
    string,
    StaarkLogMetaValue
  >;
};

export type AdminLogQuery = {
  limit?: number;
  level?: AdminLogLevel;
  area?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type AdminLogStats = {
  files: number;
  entries: number;
  critical: number;
  errors: number;
  warnings: number;
  info: number;
  debug: number;
  malformedLines: number;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
};

const store =
  createStorageLogStore();

const logger =
  createStaarkLogger({
    context: {
      source: "admin",
    },

    sink:
      createStorageLogSink(
        store,
      ),
  });

function normalizeLevel(
  level:
    | AdminLogLevel
    | undefined,
): StaarkLogLevel {
  switch (level) {
    case "debug":
    case "warning":
    case "error":
    case "critical":
      return level;

    default:
      return "info";
  }
}

function metaValue(
  value: unknown,
): StaarkLogMetaValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return undefined;
}

function mapEntry(
  entry: Awaited<
    ReturnType<
      typeof store.list
    >
  >[number],
): AdminLogEntry {
  const rawArea =
    entry.meta?.area;

  const rawAction =
    entry.meta?.action;

  const rawActor =
    entry.meta?.actor;

  const area =
    typeof rawArea ===
      "string"
      ? rawArea
      : entry.source;

  const action =
    typeof rawAction ===
      "string"
      ? rawAction
      : entry.event;

  const actor =
    typeof rawActor ===
      "string"
      ? rawActor
      : entry.actor?.type ??
        "system";

  const {
    area: _area,
    action: _action,
    actor: _actor,
    ...restMeta
  } =
    entry.meta ?? {};

  return {
    id: entry.id,
    at: entry.timestamp,
    level: entry.level,
    area,
    action,
    message:
      entry.message,
    actor,

    ...(Object.keys(
      restMeta,
    ).length
      ? {
          meta:
            restMeta,
        }
      : {}),
  };
}

function parseDateBoundary(
  value: string | undefined,
  endOfDay = false,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmed,
    )
  ) {
    return endOfDay
      ? `${trimmed}T23:59:59.999Z`
      : `${trimmed}T00:00:00.000Z`;
  }

  const parsed =
    new Date(trimmed);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return undefined;
  }

  return parsed.toISOString();
}

function matchesAdminQuery(
  item: AdminLogEntry,
  query: AdminLogQuery,
): boolean {
  if (
    query.level &&
    item.level !== query.level
  ) {
    return false;
  }

  const area =
    query.area
      ?.trim()
      .toLowerCase();

  if (
    area &&
    item.area.toLowerCase() !== area
  ) {
    return false;
  }

  const search =
    query.search
      ?.trim()
      .toLowerCase();

  if (search) {
    const haystack = [
      item.id,
      item.level,
      item.area,
      item.action,
      item.message,
      item.actor,
      item.meta
        ? JSON.stringify(
            item.meta,
          )
        : "",
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

export async function appendAdminLog(
  input: {
    level?: AdminLogLevel;
    area: string;
    action: string;
    message: string;
    actor?: string;
    actorRole?:
      | "client"
      | "manager"
      | "system";
    meta?: Record<
      string,
      string | number | boolean | null | undefined
    >;
  },
): Promise<void> {
  try {
    const area =
      input.area.trim() ||
      "system";

    const action =
      input.action.trim() ||
      "event";

    const extraMeta =
      input.meta
        ? Object.fromEntries(
            Object.entries(
              input.meta,
            )
              .map(
                ([key, value]) =>
                  [
                    key,
                    metaValue(
                      value,
                    ),
                  ] as const,
              )
              .filter(
                (
                  entry,
                ): entry is [
                  string,
                  StaarkLogMetaValue,
                ] =>
                  entry[1] !==
                  undefined,
              ),
          )
        : {};

    await logger.log(
      normalizeLevel(
        input.level,
      ),
      {
        source: "admin",

        event:
          `${area}.${action}`,

        message:
          input.message,

        actor: {
          type:
            input.actorRole ??
            (
              input.actor &&
              input.actor !==
                "system"
                ? "manager"
                : "system"
            ),
        },

        meta: {
          area,
          action,
          actor:
            input.actor?.trim() ||
            "admin",
          ...extraMeta,
        },
      },
    );
  } catch (error) {
    console.error(
      "[staark] Could not persist application log:",
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

export async function listAdminLogs(
  limitOrQuery:
    | number
    | AdminLogQuery = 200,
): Promise<AdminLogEntry[]> {
  const query:
    AdminLogQuery =
    typeof limitOrQuery ===
      "number"
      ? {
          limit:
            limitOrQuery,
        }
      : limitOrQuery;

  const limit =
    Math.max(
      1,
      Math.min(
        query.limit ?? 200,
        5_000,
      ),
    );

  /*
   * Load some headroom because area/action/search
   * are compatibility metadata and are filtered
   * after mapping the structured store entry.
   */
  const raw =
    await store.list({
      limit:
        Math.min(
          Math.max(
            limit * 8,
            500,
          ),
          5_000,
        ),

      ...(query.level
        ? {
            levels: [
              query.level,
            ],
          }
        : {}),

      ...(parseDateBoundary(
        query.from,
      )
        ? {
            from:
              parseDateBoundary(
                query.from,
              ),
          }
        : {}),

      ...(parseDateBoundary(
        query.to,
        true,
      )
        ? {
            to:
              parseDateBoundary(
                query.to,
                true,
              ),
          }
        : {}),
    });

  return raw
    .map(mapEntry)
    .filter(
      (item) =>
        matchesAdminQuery(
          item,
          query,
        ),
    )
    .slice(
      0,
      limit,
    );
}

export async function getAdminLogStats(
  query: Pick<
    AdminLogQuery,
    "from" | "to"
  > = {},
): Promise<AdminLogStats> {
  const stats =
    await store.stats({
      ...(parseDateBoundary(
        query.from,
      )
        ? {
            from:
              parseDateBoundary(
                query.from,
              ),
          }
        : {}),

      ...(parseDateBoundary(
        query.to,
        true,
      )
        ? {
            to:
              parseDateBoundary(
                query.to,
                true,
              ),
          }
        : {}),
    });

  return {
    files:
      stats.files,

    entries:
      stats.entries,

    critical:
      stats.critical,

    errors:
      stats.error,

    warnings:
      stats.warning,

    info:
      stats.info,

    debug:
      stats.debug,

    malformedLines:
      stats.malformedLines,

    oldestTimestamp:
      stats.oldestTimestamp,

    newestTimestamp:
      stats.newestTimestamp,
  };
}

export async function listAdminLogAreas():
  Promise<string[]> {
  const logs =
    await listAdminLogs({
      limit: 5_000,
    });

  return Array.from(
    new Set(
      logs
        .map(
          (item) =>
            item.area.trim(),
        )
        .filter(Boolean),
    ),
  ).sort(
    (a, b) =>
      a.localeCompare(b),
  );
}

export async function clearAdminLogs():
  Promise<void> {
  await store.clear();
}
