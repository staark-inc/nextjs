import {
  test,
} from "node:test";

import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import path from "node:path";

import {
  FsStorage,
} from "@staark/core/storage";

import {
  createStorageLogStore,
} from "../src/storage-store.ts";

import type {
  StaarkLogEntry,
} from "../src/types.ts";

function logEntry(
  id: string,
  timestamp: string,
  overrides:
    Partial<StaarkLogEntry> = {},
): StaarkLogEntry {
  return {
    schemaVersion: 1,
    id,
    timestamp,
    level: "info",
    source: "runtime",
    event: "test.event",
    message: `Message ${id}`,
    ...overrides,
  };
}

test(
  "storage log store persists entries in daily JSONL files",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const storage =
        new FsStorage(root);

      const store =
        createStorageLogStore({
          storage,
          now: () =>
            new Date(
              "2026-10-05T12:00:00.000Z",
            ),
        });

      const result =
        await store.append(
          logEntry(
            "log_1",
            "2026-10-05T10:00:00.000Z",
          ),
        );

      assert.equal(
        result.stored,
        true,
      );

      assert.equal(
        result.duplicate,
        false,
      );

      assert.equal(
        result.path,
        ".staark/logs/2026-10-05.jsonl",
      );

      const raw =
        await storage.readText(
          ".staark/logs/2026-10-05.jsonl",
        );

      assert.match(
        raw ?? "",
        /"id":"log_1"/,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "storage log store deduplicates retries by log id",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const storage =
        new FsStorage(root);

      const store =
        createStorageLogStore({
          storage,
        });

      const item =
        logEntry(
          "same_id",
          "2026-10-05T10:00:00.000Z",
        );

      const first =
        await store.append(
          item,
        );

      const second =
        await store.append(
          item,
        );

      assert.equal(
        first.stored,
        true,
      );

      assert.equal(
        second.stored,
        false,
      );

      assert.equal(
        second.duplicate,
        true,
      );

      const listed =
        await store.list({
          limit: 100,
        });

      assert.equal(
        listed.length,
        1,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "reader ignores malformed JSONL lines instead of failing",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const storage =
        new FsStorage(root);

      await storage.write(
        ".staark/logs/2026-10-05.jsonl",
        [
          JSON.stringify(
            logEntry(
              "good_1",
              "2026-10-05T10:00:00.000Z",
            ),
          ),
          "{broken-json",
          JSON.stringify({
            nope: true,
          }),
          "",
        ].join("\n"),
      );

      const store =
        createStorageLogStore({
          storage,
        });

      const listed =
        await store.list();

      assert.deepEqual(
        listed.map(
          (item) => item.id,
        ),
        ["good_1"],
      );

      const stats =
        await store.stats();

      assert.equal(
        stats.entries,
        1,
      );

      assert.equal(
        stats.malformedLines,
        2,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "list supports level source search and date filters",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const store =
        createStorageLogStore({
          storage:
            new FsStorage(root),
        });

      await store.append(
        logEntry(
          "info_1",
          "2026-10-04T10:00:00.000Z",
          {
            level: "info",
            source: "runtime",
            message:
              "Runtime started",
          },
        ),
      );

      await store.append(
        logEntry(
          "error_1",
          "2026-10-05T11:00:00.000Z",
          {
            level: "error",
            source: "database",
            event:
              "database.unreachable",
            message:
              "Postgres connection failed",
          },
        ),
      );

      await store.append(
        logEntry(
          "warning_1",
          "2026-10-05T12:00:00.000Z",
          {
            level:
              "warning",
            source:
              "storage",
            message:
              "Slow storage write",
          },
        ),
      );

      const errors =
        await store.list({
          levels: [
            "error",
          ],
        });

      assert.deepEqual(
        errors.map(
          (item) => item.id,
        ),
        ["error_1"],
      );

      const database =
        await store.list({
          sources: [
            "database",
          ],
        });

      assert.deepEqual(
        database.map(
          (item) => item.id,
        ),
        ["error_1"],
      );

      const search =
        await store.list({
          search:
            "postgres",
        });

      assert.deepEqual(
        search.map(
          (item) => item.id,
        ),
        ["error_1"],
      );

      const dated =
        await store.list({
          from:
            "2026-10-05T00:00:00.000Z",
        });

      assert.deepEqual(
        dated.map(
          (item) => item.id,
        ),
        [
          "warning_1",
          "error_1",
        ],
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "stats count levels and timestamps",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const store =
        createStorageLogStore({
          storage:
            new FsStorage(root),
        });

      await store.append(
        logEntry(
          "a",
          "2026-10-05T10:00:00.000Z",
          {
            level:
              "warning",
          },
        ),
      );

      await store.append(
        logEntry(
          "b",
          "2026-10-05T11:00:00.000Z",
          {
            level:
              "error",
          },
        ),
      );

      await store.append(
        logEntry(
          "c",
          "2026-10-05T12:00:00.000Z",
          {
            level:
              "critical",
          },
        ),
      );

      const stats =
        await store.stats();

      assert.equal(
        stats.files,
        1,
      );

      assert.equal(
        stats.entries,
        3,
      );

      assert.equal(
        stats.warning,
        1,
      );

      assert.equal(
        stats.error,
        1,
      );

      assert.equal(
        stats.critical,
        1,
      );

      assert.equal(
        stats.oldestTimestamp,
        "2026-10-05T10:00:00.000Z",
      );

      assert.equal(
        stats.newestTimestamp,
        "2026-10-05T12:00:00.000Z",
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "retention cleanup deletes only expired daily files",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const storage =
        new FsStorage(root);

      await storage.write(
        ".staark/logs/2026-09-01.jsonl",
        `${JSON.stringify(
          logEntry(
            "old",
            "2026-09-01T10:00:00.000Z",
          ),
        )}\n`,
      );

      await storage.write(
        ".staark/logs/2026-10-04.jsonl",
        `${JSON.stringify(
          logEntry(
            "recent",
            "2026-10-04T10:00:00.000Z",
          ),
        )}\n`,
      );

      await storage.write(
        ".staark/logs/2026-10-05.jsonl",
        `${JSON.stringify(
          logEntry(
            "today",
            "2026-10-05T10:00:00.000Z",
          ),
        )}\n`,
      );

      const store =
        createStorageLogStore({
          storage,
          retentionDays: 30,

          now: () =>
            new Date(
              "2026-10-05T12:00:00.000Z",
            ),
        });

      const result =
        await store.cleanup();

      assert.deepEqual(
        result.deletedPaths,
        [
          ".staark/logs/2026-09-01.jsonl",
        ],
      );

      assert.equal(
        await storage.exists(
          ".staark/logs/2026-09-01.jsonl",
        ),
        false,
      );

      assert.equal(
        await storage.exists(
          ".staark/logs/2026-10-04.jsonl",
        ),
        true,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "daily safety cap keeps the newest entries",
  async () => {
    const root =
      await mkdtemp(
        path.join(
          tmpdir(),
          "staark-logs-",
        ),
      );

    try {
      const store =
        createStorageLogStore({
          storage:
            new FsStorage(root),

          /*
           * Store clamps the configured minimum to 100,
           * so insert 101 events and verify oldest eviction.
           */
          maxEntriesPerDay: 100,
        });

      for (
        let i = 0;
        i < 101;
        i += 1
      ) {
        await store.append(
          logEntry(
            `log_${i}`,
            `2026-10-05T10:${
              String(
                Math.floor(
                  i / 60,
                ),
              ).padStart(
                2,
                "0",
              )
            }:${
              String(
                i % 60,
              ).padStart(
                2,
                "0",
              )
            }.000Z`,
          ),
        );
      }

      const listed =
        await store.list({
          limit: 200,
        });

      assert.equal(
        listed.length,
        100,
      );

      assert.equal(
        listed.some(
          (item) =>
            item.id ===
            "log_0",
        ),
        false,
      );

      assert.equal(
        listed.some(
          (item) =>
            item.id ===
            "log_100",
        ),
        true,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);
