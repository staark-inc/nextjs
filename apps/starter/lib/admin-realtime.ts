import "server-only";

import {
  EventEmitter,
} from "node:events";

import {
  Client,
} from "pg";

import {
  getPrismaClient,
} from "./db/prisma";

const CHANNEL =
  "staark_admin_events";

export const ADMIN_REALTIME_TYPES = [
  "submission.received",
  "submission.status.changed",
  "booking.status.changed",
  "inbox.updated",
  "automation.started",
  "automation.succeeded",
  "automation.failed",
] as const;

export type AdminRealtimeType =
  (typeof ADMIN_REALTIME_TYPES)[number];

export type AdminRealtimeEvent = {
  siteId: string;
  type: AdminRealtimeType;
  at: string;
  data: Record<string, unknown>;
};

type Listener = (
  event: AdminRealtimeEvent,
) => void;

type RealtimeState = {
  emitter: EventEmitter;
  client: Client | null;
  connecting: Promise<void> | null;
  retryTimer: NodeJS.Timeout | null;
};

const globalRealtime =
  globalThis as typeof globalThis & {
    __staarkAdminRealtime?: RealtimeState;
  };

function state(): RealtimeState {
  if (
    !globalRealtime.__staarkAdminRealtime
  ) {
    const emitter =
      new EventEmitter();

    emitter.setMaxListeners(
      0,
    );

    globalRealtime.__staarkAdminRealtime = {
      emitter,
      client:
        null,
      connecting:
        null,
      retryTimer:
        null,
    };
  }

  return globalRealtime.__staarkAdminRealtime;
}

function databaseUrl(): string {
  const value =
    process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL is required for admin realtime events.",
    );
  }

  return value;
}

function isRealtimeType(
  value: unknown,
): value is AdminRealtimeType {
  return (
    typeof value === "string" &&
    (
      ADMIN_REALTIME_TYPES as
        readonly string[]
    ).includes(value)
  );
}

function parseNotification(
  payload: string | undefined,
): AdminRealtimeEvent | null {
  if (!payload) {
    return null;
  }

  try {
    const value =
      JSON.parse(
        payload,
      ) as Record<string, unknown>;

    if (
      typeof value.siteId !==
        "string" ||
      typeof value.at !==
        "string" ||
      !isRealtimeType(
        value.type,
      )
    ) {
      return null;
    }

    return {
      siteId:
        value.siteId,

      type:
        value.type,

      at:
        value.at,

      data:
        value.data &&
        typeof value.data ===
          "object" &&
        !Array.isArray(
          value.data,
        )
          ? value.data as
              Record<string, unknown>
          : {},
    };
  } catch {
    return null;
  }
}

function scheduleReconnect() {
  const current =
    state();

  if (
    current.retryTimer ||
    current.connecting ||
    current.client
  ) {
    return;
  }

  current.retryTimer =
    setTimeout(
      () => {
        current.retryTimer =
          null;

        void ensureListener()
          .catch(
            (error) => {
              console.warn(
                "[realtime] PostgreSQL listener reconnect failed:",
                error instanceof Error
                  ? error.message
                  : String(error),
              );

              scheduleReconnect();
            },
          );
      },
      1500,
    );
}

function disconnected(
  client: Client,
) {
  const current =
    state();

  if (
    current.client ===
    client
  ) {
    current.client =
      null;
  }

  scheduleReconnect();
}

async function ensureListener():
Promise<void> {
  const current =
    state();

  if (current.client) {
    return;
  }

  if (current.connecting) {
    return current.connecting;
  }

  const connecting =
    (async () => {
      const client =
        new Client({
          connectionString:
            databaseUrl(),
        });

      client.on(
        "notification",
        (message) => {
          if (
            message.channel !==
            CHANNEL
          ) {
            return;
          }

          const event =
            parseNotification(
              message.payload,
            );

          if (!event) {
            return;
          }

          state().emitter.emit(
            event.siteId,
            event,
          );
        },
      );

      client.on(
        "error",
        (error) => {
          console.warn(
            "[realtime] PostgreSQL listener error:",
            error.message,
          );

          disconnected(
            client,
          );
        },
      );

      client.on(
        "end",
        () => {
          disconnected(
            client,
          );
        },
      );

      await client.connect();

      await client.query(
        `LISTEN ${CHANNEL}`,
      );

      current.client =
        client;
    })();

  current.connecting =
    connecting;

  try {
    await connecting;
  } finally {
    if (
      current.connecting ===
      connecting
    ) {
      current.connecting =
        null;
    }
  }
}

export function subscribeAdminRealtime(
  siteId: string,
  listener: Listener,
): () => void {
  const current =
    state();

  current.emitter.on(
    siteId,
    listener,
  );

  void ensureListener()
    .catch(
      (error) => {
        console.warn(
          "[realtime] Could not start PostgreSQL listener:",
          error instanceof Error
            ? error.message
            : String(error),
        );

        scheduleReconnect();
      },
    );

  return () => {
    current.emitter.off(
      siteId,
      listener,
    );
  };
}

export async function publishAdminRealtime(
  siteId: string,
  type: AdminRealtimeType,
  data: Record<string, unknown> = {},
): Promise<void> {
  const event: AdminRealtimeEvent = {
    siteId,
    type,
    at:
      new Date().toISOString(),
    data,
  };

  const payload =
    JSON.stringify(
      event,
    );

  /*
   * PostgreSQL NOTIFY payloads are intentionally small.
   * Realtime only carries invalidation/event metadata;
   * the browser fetches authoritative state through APIs.
   */
  if (
    Buffer.byteLength(
      payload,
      "utf8",
    ) > 7000
  ) {
    console.warn(
      "[realtime] Event payload exceeded safe NOTIFY size.",
    );

    return;
  }

  try {
    await getPrismaClient()
      .$queryRawUnsafe(
        `SELECT pg_notify('${CHANNEL}', $1)`,
        payload,
      );
  } catch (error) {
    /*
     * Realtime is never authoritative.
     * A notification failure must not roll back business data.
     */
    console.warn(
      "[realtime] Could not publish admin event:",
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}
