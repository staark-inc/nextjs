import type {
  StaarkLogEntry,
  StaarkLogSink,
} from "./types.ts";

export const DEFAULT_MANAGER_LOG_PATH =
  "/api/staark/logs";

export const DEFAULT_LOG_OUTBOX_PATH =
  ".staark/logs-outbox.jsonl";

export const DEFAULT_LOG_OUTBOX_MAX_ENTRIES =
  2_000;

export type ManagerLogAck = {
  accepted: true;
  logId: string;
};

export type ManagerLogEnvelope = {
  schemaVersion: 1;
  entry: StaarkLogEntry;
};

export type ManagerLogTransport = {
  send(
    entry: StaarkLogEntry,
  ): Promise<ManagerLogAck>;
};

export type StaarkLogOutbox = {
  enqueue(
    entry: StaarkLogEntry,
  ): Promise<void>;

  list(): Promise<StaarkLogEntry[]>;

  remove(
    ids: readonly string[],
  ): Promise<void>;

  size(): Promise<number>;

  clear(): Promise<void>;
};

export type ReliableManagerSinkOptions = {
  transport: ManagerLogTransport;
  outbox: StaarkLogOutbox;

  /**
   * Retry queued events before trying the new event.
   * Default: true.
   */
  flushBeforeWrite?: boolean;

  /**
   * Maximum queued events attempted in one flush.
   * Default: 100.
   */
  flushBatchSize?: number;

  onDeliveryError?: (
    error: unknown,
    entry: StaarkLogEntry,
  ) => void;
};

export type ReliableManagerSink =
  StaarkLogSink & {
    flush(): Promise<{
      attempted: number;
      delivered: number;
      remaining: number;
    }>;

    pending(): Promise<number>;
  };
