import {
  test,
} from "node:test";

import assert from "node:assert/strict";

import {
  createStaarkLogger,
} from "../src/logger.ts";

import type {
  StaarkLogEntry,
} from "../src/types.ts";

test(
  "logger builds structured entries and sends them to the sink",
  async () => {
    const written:
      StaarkLogEntry[] = [];

    const logger =
      createStaarkLogger({
        context: {
          siteId: "site_123",
          organizationId:
            "org_123",
          source: "runtime",
        },

        sink: {
          write(entry) {
            written.push(entry);
          },
        },

        now: () =>
          new Date(
            "2026-10-05T12:00:00.000Z",
          ),

        createId: () =>
          "log_test_1",
      });

    const entry =
      await logger.info({
        event:
          "runtime.started",
        message:
          "Runtime started",
        meta: {
          theme: "salong",
          token: "secret",
        },
      });

    assert.equal(
      entry.id,
      "log_test_1",
    );

    assert.equal(
      entry.timestamp,
      "2026-10-05T12:00:00.000Z",
    );

    assert.equal(
      entry.siteId,
      "site_123",
    );

    assert.equal(
      entry.organizationId,
      "org_123",
    );

    assert.equal(
      entry.source,
      "runtime",
    );

    assert.equal(
      entry.level,
      "info",
    );

    assert.equal(
      entry.meta?.theme,
      "salong",
    );

    assert.equal(
      entry.meta?.token,
      "[REDACTED]",
    );

    assert.deepEqual(
      written,
      [entry],
    );
  },
);

test(
  "child logger inherits context and can override it",
  async () => {
    const entries:
      StaarkLogEntry[] = [];

    const logger =
      createStaarkLogger({
        context: {
          siteId: "site_a",
          source: "system",
        },

        sink: {
          write(entry) {
            entries.push(entry);
          },
        },

        createId: () =>
          "log_child",

        now: () =>
          new Date(
            "2026-10-05T12:00:00.000Z",
          ),
      });

    const child =
      logger.child({
        source: "storage",
        actor: {
          type: "manager",
          id: "user_1",
        },
      });

    await child.warning({
      event:
        "storage.slow",
      message:
        "Storage write was slow",
    });

    assert.equal(
      entries[0]?.siteId,
      "site_a",
    );

    assert.equal(
      entries[0]?.source,
      "storage",
    );

    assert.deepEqual(
      entries[0]?.actor,
      {
        type: "manager",
        id: "user_1",
      },
    );
  },
);

test(
  "sink failures never break the logged operation",
  async () => {
    let reported = false;

    const logger =
      createStaarkLogger({
        sink: {
          write() {
            throw new Error(
              "transport down",
            );
          },
        },

        onFailure(error) {
          assert.match(
            String(error),
            /transport down/,
          );

          reported = true;
        },

        createId: () =>
          "log_failure",

        now: () =>
          new Date(
            "2026-10-05T12:00:00.000Z",
          ),
      });

    const entry =
      await logger.error({
        source: "api",
        event:
          "request.failed",
        message:
          "Request failed",
      });

    assert.equal(
      entry.id,
      "log_failure",
    );

    assert.equal(
      reported,
      true,
    );
  },
);
