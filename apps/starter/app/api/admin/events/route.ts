import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  subscribeAdminRealtime,
  type AdminRealtimeEvent,
} from "@/lib/admin-realtime";

import {
  requireAuth,
} from "../guard";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const encoder =
  new TextEncoder();

function encodeEvent(
  event: AdminRealtimeEvent,
): Uint8Array {
  return encoder.encode(
    `id: ${event.at}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export async function GET(
  request: Request,
): Promise<Response> {
  const blocked =
    await requireAuth();

  if (blocked) {
    return blocked;
  }

  let tenant:
    Awaited<
      ReturnType<
        typeof requireAdminTenantContext
      >
    >;

  try {
    tenant =
      await requireAdminTenantContext();
  } catch {
    return Response.json(
      {
        ok: false,
        code:
          "TENANT_NOT_FOUND",
        error:
          "Tenant could not be resolved.",
      },
      {
        status: 404,
      },
    );
  }

  let unsubscribe:
    (() => void) | null =
      null;

  let heartbeat:
    ReturnType<
      typeof setInterval
    > | null =
      null;

  const stream =
    new ReadableStream<Uint8Array>({
      start(controller) {
        let closed =
          false;

        function close() {
          if (closed) {
            return;
          }

          closed =
            true;

          if (heartbeat) {
            clearInterval(
              heartbeat,
            );

            heartbeat =
              null;
          }

          unsubscribe?.();
          unsubscribe =
            null;

          try {
            controller.close();
          } catch {
            // Stream may already be closed by the client.
          }
        }

        controller.enqueue(
          encoder.encode(
            `: connected ${Date.now()}\n\n`,
          ),
        );

        unsubscribe =
          subscribeAdminRealtime(
            tenant.siteId,
            (event) => {
              if (closed) {
                return;
              }

              try {
                controller.enqueue(
                  encodeEvent(
                    event,
                  ),
                );
              } catch {
                close();
              }
            },
          );

        heartbeat =
          setInterval(
            () => {
              if (closed) {
                return;
              }

              try {
                controller.enqueue(
                  encoder.encode(
                    `: heartbeat ${Date.now()}\n\n`,
                  ),
                );
              } catch {
                close();
              }
            },
            20_000,
          );

        request.signal.addEventListener(
          "abort",
          close,
          {
            once:
              true,
          },
        );
      },

      cancel() {
        if (heartbeat) {
          clearInterval(
            heartbeat,
          );

          heartbeat =
            null;
        }

        unsubscribe?.();
        unsubscribe =
          null;
      },
    });

  return new Response(
    stream,
    {
      headers: {
        "Content-Type":
          "text/event-stream; charset=utf-8",

        "Cache-Control":
          "no-cache, no-transform",

        Connection:
          "keep-alive",

        "X-Accel-Buffering":
          "no",
      },
    },
  );
}
