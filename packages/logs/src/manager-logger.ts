import type {
  HubConnection,
  StaarkStorage,
} from "@staark/core/server";

import {
  createStaarkLogger,
} from "./logger.ts";

import {
  createManagerLogTransport,
} from "./manager-client.ts";

import {
  createStorageLogOutbox,
} from "./outbox.ts";

import {
  createReliableManagerSink,
} from "./reliable-sink.ts";

import type {
  StaarkLogContext,
  StaarkLogger,
} from "./types.ts";

import type {
  ReliableManagerSink,
} from "./transport-types.ts";

export type ManagerLoggerOptions = {
  context?: StaarkLogContext;

  connection?: HubConnection;
  storage?: StaarkStorage;

  managerPath?: string;
  outboxPath?: string;
  outboxMaxEntries?: number;

  flushBeforeWrite?: boolean;
  flushBatchSize?: number;

  onDeliveryError?: (
    error: unknown,
  ) => void;
};

export type ManagerLogger = {
  logger: StaarkLogger;
  sink: ReliableManagerSink;
};

export function createManagerLogger(
  options:
    ManagerLoggerOptions = {},
): ManagerLogger {
  const transport =
    createManagerLogTransport({
      ...(options.connection
        ? {
            connection:
              options.connection,
          }
        : {}),
      ...(options.managerPath
        ? {
            path:
              options.managerPath,
          }
        : {}),
    });

  const outbox =
    createStorageLogOutbox({
      ...(options.storage
        ? {
            storage:
              options.storage,
          }
        : {}),
      ...(options.outboxPath
        ? {
            path:
              options.outboxPath,
          }
        : {}),
      ...(options.outboxMaxEntries
        ? {
            maxEntries:
              options.outboxMaxEntries,
          }
        : {}),
    });

  const sink =
    createReliableManagerSink({
      transport,
      outbox,
      flushBeforeWrite:
        options.flushBeforeWrite,
      flushBatchSize:
        options.flushBatchSize,

      onDeliveryError(error) {
        try {
          options.onDeliveryError?.(
            error,
          );
        } catch {
          // Never break logging.
        }
      },
    });

  const logger =
    createStaarkLogger({
      context:
        options.context,
      sink,

      onFailure(error) {
        try {
          options.onDeliveryError?.(
            error,
          );
        } catch {
          // Never break logging.
        }
      },
    });

  return {
    logger,
    sink,
  };
}
