import type {
  StaarkStorage,
} from "@staark/core/server";

import {
  getStorage,
} from "@staark/core/server";

import type {
  StaarkLogEntry,
} from "./types.ts";

import {
  DEFAULT_LOG_OUTBOX_MAX_ENTRIES,
  DEFAULT_LOG_OUTBOX_PATH,
  type StaarkLogOutbox,
} from "./transport-types.ts";

export type StorageLogOutboxOptions = {
  storage?: StaarkStorage;
  path?: string;
  maxEntries?: number;
};

function parseOutbox(
  raw: string | null,
): StaarkLogEntry[] {
  if (!raw?.trim()) {
    return [];
  }

  const entries:
    StaarkLogEntry[] = [];

  for (
    const line of raw.split("\n")
  ) {
    if (!line.trim()) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          line,
        ) as Partial<StaarkLogEntry>;

      if (
        typeof parsed.id !==
          "string" ||
        typeof parsed.timestamp !==
          "string" ||
        typeof parsed.level !==
          "string" ||
        typeof parsed.source !==
          "string" ||
        typeof parsed.event !==
          "string" ||
        typeof parsed.message !==
          "string"
      ) {
        continue;
      }

      entries.push(
        parsed as StaarkLogEntry,
      );
    } catch {
      // Ignore malformed historical lines.
    }
  }

  return entries;
}

function serializeOutbox(
  entries:
    readonly StaarkLogEntry[],
): string {
  if (!entries.length) {
    return "";
  }

  return `${
    entries
      .map((entry) =>
        JSON.stringify(entry),
      )
      .join("\n")
  }\n`;
}

/**
 * Process-local lock.
 *
 * The storage driver may be FS, S3, R2 or MinIO.
 * This prevents read/modify/write races inside a
 * single runtime process.
 */
let outboxLock:
  Promise<void> =
  Promise.resolve();

async function withOutboxLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let release:
    (() => void) | undefined;

  const previous =
    outboxLock;

  outboxLock =
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

export function createStorageLogOutbox(
  options: StorageLogOutboxOptions = {},
): StaarkLogOutbox {
  const storage =
    options.storage ??
    getStorage();

  const path =
    options.path?.trim() ||
    DEFAULT_LOG_OUTBOX_PATH;

  const maxEntries =
    Math.max(
      100,
      Math.min(
        options.maxEntries ??
          DEFAULT_LOG_OUTBOX_MAX_ENTRIES,
        20_000,
      ),
    );

  async function read(): Promise<
    StaarkLogEntry[]
  > {
    return parseOutbox(
      await storage.readText(path),
    );
  }

  async function write(
    entries:
      readonly StaarkLogEntry[],
  ): Promise<void> {
    await storage.write(
      path,
      serializeOutbox(entries),
    );
  }

  return {
    async enqueue(entry) {
      await withOutboxLock(
        async () => {
          const current =
            await read();

          // Idempotent queueing by log ID.
          if (
            current.some(
              (item) =>
                item.id === entry.id,
            )
          ) {
            return;
          }

          const next = [
            ...current,
            entry,
          ].slice(-maxEntries);

          await write(next);
        },
      );
    },

    async list() {
      return withOutboxLock(
        async () => read(),
      );
    },

    async remove(ids) {
      if (!ids.length) {
        return;
      }

      const removeIds =
        new Set(ids);

      await withOutboxLock(
        async () => {
          const current =
            await read();

          const next =
            current.filter(
              (entry) =>
                !removeIds.has(
                  entry.id,
                ),
            );

          if (
            next.length ===
            current.length
          ) {
            return;
          }

          await write(next);
        },
      );
    },

    async size() {
      return withOutboxLock(
        async () =>
          (await read()).length,
      );
    },

    async clear() {
      await withOutboxLock(
        async () => {
          await write([]);
        },
      );
    },
  };
}
