import type {
  StaarkStorage,
} from "@staark/core/storage";

import {
  createStaarkLogger,
} from "./logger.ts";

import {
  createStorageLogSink,
} from "./storage-sink.ts";

import {
  createStorageLogStore,
  type StorageLogStoreOptions,
} from "./storage-store.ts";

import type {
  StaarkLogContext,
  StaarkLogger,
} from "./types.ts";

import type {
  StaarkLogStore,
} from "./store-types.ts";

export type StorageLoggerOptions = {
  context?: StaarkLogContext;

  storage?: StaarkStorage;

  prefix?: string;
  retentionDays?: number;
  maxEntriesPerDay?: number;

  onFailure?: (
    error: unknown,
  ) => void;
};

export type StorageLogger = {
  logger: StaarkLogger;
  store: StaarkLogStore;
};

export function createStorageLogger(
  options:
    StorageLoggerOptions = {},
): StorageLogger {
  const storeOptions:
    StorageLogStoreOptions = {
      ...(options.storage
        ? {
            storage:
              options.storage,
          }
        : {}),

      ...(options.prefix
        ? {
            prefix:
              options.prefix,
          }
        : {}),

      ...(options.retentionDays
        ? {
            retentionDays:
              options.retentionDays,
          }
        : {}),

      ...(options.maxEntriesPerDay
        ? {
            maxEntriesPerDay:
              options.maxEntriesPerDay,
          }
        : {}),
    };

  const store =
    createStorageLogStore(
      storeOptions,
    );

  const sink =
    createStorageLogSink(
      store,
    );

  const logger =
    createStaarkLogger({
      context:
        options.context,

      sink,

      onFailure(error) {
        try {
          options.onFailure?.(
            error,
          );
        } catch {
          // Logging must never break application work.
        }
      },
    });

  return {
    logger,
    store,
  };
}
