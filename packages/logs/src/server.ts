import "server-only";

export * from "./index.ts";

export {
  createStaarkLogger,
} from "./logger.ts";

export {
  createManagerLogTransport,
  type ManagerLogTransportOptions,
} from "./manager-client.ts";

export {
  createStorageLogOutbox,
  type StorageLogOutboxOptions,
} from "./outbox.ts";

export {
  createReliableManagerSink,
} from "./reliable-sink.ts";

export {
  createManagerLogger,
  type ManagerLogger,
  type ManagerLoggerOptions,
} from "./manager-logger.ts";

export {
  createStorageLogStore,
  type StorageLogStoreOptions,
} from "./storage-store.ts";

export {
  createStorageLogSink,
} from "./storage-sink.ts";

export {
  createStorageLogger,
  type StorageLogger,
  type StorageLoggerOptions,
} from "./storage-logger.ts";

export {
  DEFAULT_LOG_MAX_ENTRIES_PER_DAY,
  DEFAULT_LOG_RETENTION_DAYS,
  DEFAULT_LOG_STORE_PREFIX,
  type StaarkLogStore,
  type StaarkLogStoreCleanupResult,
  type StaarkLogStoreQuery,
  type StaarkLogStoreStats,
  type StaarkLogStoreWriteResult,
} from "./store-types.ts";

export {
  DEFAULT_LOG_OUTBOX_MAX_ENTRIES,
  DEFAULT_LOG_OUTBOX_PATH,
  DEFAULT_MANAGER_LOG_PATH,
  type ManagerLogAck,
  type ManagerLogEnvelope,
  type ManagerLogTransport,
  type ReliableManagerSink,
  type ReliableManagerSinkOptions,
  type StaarkLogOutbox,
} from "./transport-types.ts";
