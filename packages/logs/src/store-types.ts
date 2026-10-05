import type {
  StaarkLogEntry,
  StaarkLogLevel,
  StaarkLogSource,
} from "./types.ts";

export const DEFAULT_LOG_STORE_PREFIX =
  ".staark/logs";

export const DEFAULT_LOG_RETENTION_DAYS =
  30;

export const DEFAULT_LOG_MAX_ENTRIES_PER_DAY =
  20_000;

export type StaarkLogStoreQuery = {
  limit?: number;

  levels?: readonly StaarkLogLevel[];
  sources?: readonly StaarkLogSource[];

  search?: string;

  from?: Date | string;
  to?: Date | string;
};

export type StaarkLogStoreStats = {
  files: number;
  entries: number;

  debug: number;
  info: number;
  warning: number;
  error: number;
  critical: number;

  malformedLines: number;

  oldestTimestamp: string | null;
  newestTimestamp: string | null;
};

export type StaarkLogStoreWriteResult = {
  stored: boolean;
  duplicate: boolean;
  path: string;
};

export type StaarkLogStoreCleanupResult = {
  deletedFiles: number;
  deletedPaths: string[];
};

export type StaarkLogStore = {
  append(
    entry: StaarkLogEntry,
  ): Promise<StaarkLogStoreWriteResult>;

  list(
    query?: StaarkLogStoreQuery,
  ): Promise<StaarkLogEntry[]>;

  stats(
    query?: Pick<
      StaarkLogStoreQuery,
      "from" | "to"
    >,
  ): Promise<StaarkLogStoreStats>;

  cleanup(): Promise<StaarkLogStoreCleanupResult>;

  clear(): Promise<void>;
};
