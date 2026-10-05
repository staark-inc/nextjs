import type {
  StaarkLogEntry,
} from "./types.ts";

import type {
  ReliableManagerSink,
  ReliableManagerSinkOptions,
} from "./transport-types.ts";

function safeReport(
  options:
    ReliableManagerSinkOptions,
  error: unknown,
  entry: StaarkLogEntry,
): void {
  try {
    options.onDeliveryError?.(
      error,
      entry,
    );
  } catch {
    // Reporting delivery failures must never
    // break application work.
  }
}

export function createReliableManagerSink(
  options:
    ReliableManagerSinkOptions,
): ReliableManagerSink {
  const batchSize =
    Math.max(
      1,
      Math.min(
        options.flushBatchSize ??
          100,
        500,
      ),
    );

  let flushPromise:
    Promise<{
      attempted: number;
      delivered: number;
      remaining: number;
    }> | null = null;

  async function doFlush() {
    const queued =
      (
        await options.outbox.list()
      ).slice(
        0,
        batchSize,
      );

    let attempted = 0;
    let delivered = 0;

    for (
      const entry of queued
    ) {
      attempted += 1;

      try {
        await options.transport.send(
          entry,
        );

        await options.outbox.remove(
          [entry.id],
        );

        delivered += 1;
      } catch (error) {
        safeReport(
          options,
          error,
          entry,
        );

        /*
         * FIFO semantics:
         *
         * Stop after the first failed delivery.
         * This avoids repeatedly hammering an
         * unavailable Manager and preserves
         * chronological ordering.
         */
        break;
      }
    }

    return {
      attempted,
      delivered,
      remaining:
        await options.outbox.size(),
    };
  }

  async function flush() {
    if (flushPromise) {
      return flushPromise;
    }

    flushPromise =
      doFlush().finally(
        () => {
          flushPromise = null;
        },
      );

    return flushPromise;
  }

  return {
    async write(entry) {
      if (
        options.flushBeforeWrite !==
        false
      ) {
        await flush();
      }

      try {
        await options.transport.send(
          entry,
        );

        return;
      } catch (error) {
        safeReport(
          options,
          error,
          entry,
        );
      }

      /*
       * Manager is unavailable.
       *
       * Local storage is NOT the source of
       * truth. This event is only staged for
       * future delivery.
       */
      await options.outbox.enqueue(
        entry,
      );
    },

    flush,

    pending() {
      return options.outbox.size();
    },
  };
}
