import {
  test,
} from "node:test";

import assert from "node:assert/strict";

import {
  createReliableManagerSink,
} from "../src/reliable-sink.ts";

import type {
  StaarkLogEntry,
} from "../src/types.ts";

import type {
  ManagerLogTransport,
  StaarkLogOutbox,
} from "../src/transport-types.ts";

function entry(
  id: string,
): StaarkLogEntry {
  return {
    schemaVersion: 1,
    id,
    timestamp:
      "2026-10-05T12:00:00.000Z",
    level: "info",
    source: "runtime",
    event: "test.event",
    message: "Test event",
  };
}

function memoryOutbox(): {
  outbox: StaarkLogOutbox;
  entries: StaarkLogEntry[];
} {
  const entries:
    StaarkLogEntry[] = [];

  return {
    entries,

    outbox: {
      async enqueue(item) {
        if (
          !entries.some(
            (entry) =>
              entry.id === item.id,
          )
        ) {
          entries.push(item);
        }
      },

      async list() {
        return [...entries];
      },

      async remove(ids) {
        const set =
          new Set(ids);

        for (
          let i =
            entries.length - 1;
          i >= 0;
          i -= 1
        ) {
          if (
            set.has(
              entries[i]!.id,
            )
          ) {
            entries.splice(
              i,
              1,
            );
          }
        }
      },

      async size() {
        return entries.length;
      },

      async clear() {
        entries.length = 0;
      },
    },
  };
}

test(
  "successful Manager delivery does not queue the event",
  async () => {
    const delivered:
      string[] = [];

    const transport:
      ManagerLogTransport = {
        async send(item) {
          delivered.push(
            item.id,
          );

          return {
            accepted: true,
            logId: item.id,
          };
        },
      };

    const {
      outbox,
      entries,
    } = memoryOutbox();

    const sink =
      createReliableManagerSink({
        transport,
        outbox,
      });

    await sink.write(
      entry("log_1"),
    );

    assert.deepEqual(
      delivered,
      ["log_1"],
    );

    assert.equal(
      entries.length,
      0,
    );
  },
);

test(
  "failed Manager delivery is staged in the outbox",
  async () => {
    const transport:
      ManagerLogTransport = {
        async send() {
          throw new Error(
            "Manager offline",
          );
        },
      };

    const {
      outbox,
      entries,
    } = memoryOutbox();

    const sink =
      createReliableManagerSink({
        transport,
        outbox,
        flushBeforeWrite:
          false,
      });

    await sink.write(
      entry("log_2"),
    );

    assert.deepEqual(
      entries.map(
        (item) => item.id,
      ),
      ["log_2"],
    );

    assert.equal(
      await sink.pending(),
      1,
    );
  },
);

test(
  "flush retries queued events and removes only acknowledged events",
  async () => {
    const {
      outbox,
      entries,
    } = memoryOutbox();

    await outbox.enqueue(
      entry("log_a"),
    );

    await outbox.enqueue(
      entry("log_b"),
    );

    const delivered:
      string[] = [];

    const transport:
      ManagerLogTransport = {
        async send(item) {
          delivered.push(
            item.id,
          );

          return {
            accepted: true,
            logId: item.id,
          };
        },
      };

    const sink =
      createReliableManagerSink({
        transport,
        outbox,
      });

    const result =
      await sink.flush();

    assert.deepEqual(
      delivered,
      [
        "log_a",
        "log_b",
      ],
    );

    assert.deepEqual(
      entries,
      [],
    );

    assert.deepEqual(
      result,
      {
        attempted: 2,
        delivered: 2,
        remaining: 0,
      },
    );
  },
);

test(
  "flush preserves FIFO order and stops after the first failure",
  async () => {
    const {
      outbox,
      entries,
    } = memoryOutbox();

    await outbox.enqueue(
      entry("log_a"),
    );

    await outbox.enqueue(
      entry("log_b"),
    );

    await outbox.enqueue(
      entry("log_c"),
    );

    const attempts:
      string[] = [];

    const transport:
      ManagerLogTransport = {
        async send(item) {
          attempts.push(
            item.id,
          );

          if (
            item.id ===
            "log_b"
          ) {
            throw new Error(
              "Manager unavailable",
            );
          }

          return {
            accepted: true,
            logId: item.id,
          };
        },
      };

    const sink =
      createReliableManagerSink({
        transport,
        outbox,
      });

    const result =
      await sink.flush();

    assert.deepEqual(
      attempts,
      [
        "log_a",
        "log_b",
      ],
    );

    assert.deepEqual(
      entries.map(
        (item) => item.id,
      ),
      [
        "log_b",
        "log_c",
      ],
    );

    assert.deepEqual(
      result,
      {
        attempted: 2,
        delivered: 1,
        remaining: 2,
      },
    );
  },
);

test(
  "write flushes historical queued events before the new event",
  async () => {
    const {
      outbox,
    } = memoryOutbox();

    await outbox.enqueue(
      entry("old_1"),
    );

    const delivered:
      string[] = [];

    const transport:
      ManagerLogTransport = {
        async send(item) {
          delivered.push(
            item.id,
          );

          return {
            accepted: true,
            logId: item.id,
          };
        },
      };

    const sink =
      createReliableManagerSink({
        transport,
        outbox,
      });

    await sink.write(
      entry("new_1"),
    );

    assert.deepEqual(
      delivered,
      [
        "old_1",
        "new_1",
      ],
    );

    assert.equal(
      await sink.pending(),
      0,
    );
  },
);
