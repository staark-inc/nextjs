import {
  randomUUID,
} from "node:crypto";

import {
  STAARK_LOG_SCHEMA_VERSION,
  type StaarkLogContext,
  type StaarkLogEntry,
  type StaarkLogInput,
  type StaarkLogLevel,
  type StaarkLogger,
  type StaarkLoggerOptions,
  type StaarkLogSink,
} from "./types.ts";

import {
  sanitizeLogMeta,
} from "./sanitize.ts";

const NOOP_SINK: StaarkLogSink = {
  write() {
    // Transport is intentionally supplied by the host.
    // LOG-02 will provide the Manager-backed transport.
  },
};

function normalizeText(
  value: string,
  fallback: string,
  maxLength: number,
): string {
  const normalized = value.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function mergeContext(
  parent: StaarkLogContext | undefined,
  child: StaarkLogContext,
): StaarkLogContext {
  return {
    ...parent,
    ...child,
    actor:
      child.actor ??
      parent?.actor,
  };
}

export function createStaarkLogger(
  options: StaarkLoggerOptions = {},
): StaarkLogger {
  const sink =
    options.sink ?? NOOP_SINK;

  const now =
    options.now ??
    (() => new Date());

  const createId =
    options.createId ??
    (() => randomUUID());

  const context =
    options.context ?? {};

  async function log(
    level: StaarkLogLevel,
    input: StaarkLogInput,
  ): Promise<StaarkLogEntry> {
    const meta = sanitizeLogMeta(
      input.meta,
    );

    const entry: StaarkLogEntry = {
      schemaVersion:
        STAARK_LOG_SCHEMA_VERSION,

      id: createId(),
      timestamp:
        now().toISOString(),

      level,
      source:
        input.source ??
        context.source ??
        "system",

      event: normalizeText(
        input.event,
        "event",
        160,
      ),

      message: normalizeText(
        input.message,
        "No message",
        4_000,
      ),

      ...(
        input.siteId ??
        context.siteId
          ? {
              siteId:
                input.siteId ??
                context.siteId,
            }
          : {}
      ),

      ...(
        input.organizationId ??
        context.organizationId
          ? {
              organizationId:
                input.organizationId ??
                context.organizationId,
            }
          : {}
      ),

      ...(
        input.actor ??
        context.actor
          ? {
              actor:
                input.actor ??
                context.actor,
            }
          : {}
      ),

      ...(input.request
        ? {
            request:
              input.request,
          }
        : {}),

      ...(meta
        ? { meta }
        : {}),
    };

    try {
      await sink.write(entry);
    } catch (error) {
      try {
        options.onFailure?.(
          error,
          entry,
        );
      } catch {
        // A logger failure handler must never
        // break the operation being logged.
      }
    }

    return entry;
  }

  return {
    log,

    debug(input) {
      return log("debug", input);
    },

    info(input) {
      return log("info", input);
    },

    warning(input) {
      return log(
        "warning",
        input,
      );
    },

    error(input) {
      return log("error", input);
    },

    critical(input) {
      return log(
        "critical",
        input,
      );
    },

    child(childContext) {
      return createStaarkLogger({
        ...options,
        context: mergeContext(
          context,
          childContext,
        ),
        sink,
        now,
        createId,
      });
    },
  };
}
