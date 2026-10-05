export const STAARK_LOG_SCHEMA_VERSION = 1 as const;

export type StaarkLogSchemaVersion =
  typeof STAARK_LOG_SCHEMA_VERSION;

export type StaarkLogLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

export type StaarkLogSource =
  | "runtime"
  | "admin"
  | "api"
  | "storage"
  | "database"
  | "auth"
  | "billing"
  | "theme"
  | "deployment"
  | "integration"
  | "system";

export type StaarkLogActorType =
  | "system"
  | "client"
  | "manager";

export type StaarkLogPrimitive =
  | string
  | number
  | boolean
  | null;

export type StaarkLogMetaValue =
  | StaarkLogPrimitive
  | StaarkLogMetaValue[]
  | {
      [key: string]: StaarkLogMetaValue;
    };

export type StaarkLogMeta = Record<
  string,
  StaarkLogMetaValue
>;

export type StaarkLogActor = {
  type: StaarkLogActorType;
  id?: string;
  email?: string;
};

export type StaarkLogRequest = {
  id?: string;
  method?: string;
  path?: string;
};

export type StaarkLogEntry = {
  schemaVersion: StaarkLogSchemaVersion;

  id: string;
  timestamp: string;

  level: StaarkLogLevel;
  source: StaarkLogSource;

  event: string;
  message: string;

  siteId?: string;
  organizationId?: string;

  actor?: StaarkLogActor;
  request?: StaarkLogRequest;

  meta?: StaarkLogMeta;
};

export type StaarkLogContext = {
  siteId?: string;
  organizationId?: string;
  source?: StaarkLogSource;
  actor?: StaarkLogActor;
};

export type StaarkLogInput = {
  source?: StaarkLogSource;
  event: string;
  message: string;

  siteId?: string;
  organizationId?: string;

  actor?: StaarkLogActor;
  request?: StaarkLogRequest;

  meta?: Record<string, unknown>;
};

export type StaarkLogSink = {
  write(
    entry: StaarkLogEntry,
  ): void | Promise<void>;
};

export type StaarkLogFailureHandler = (
  error: unknown,
  entry: StaarkLogEntry,
) => void;

export type StaarkLoggerOptions = {
  context?: StaarkLogContext;
  sink?: StaarkLogSink;
  onFailure?: StaarkLogFailureHandler;
  now?: () => Date;
  createId?: () => string;
};

export type StaarkLogger = {
  log(
    level: StaarkLogLevel,
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  debug(
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  info(
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  warning(
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  error(
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  critical(
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry>;

  child(
    context: StaarkLogContext,
  ): StaarkLogger;
};
