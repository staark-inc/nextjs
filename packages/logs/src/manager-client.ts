import {
  hubRequest,
  readStaarkEnv,
  type HubConnection,
} from "@staark/core/server";

import type {
  StaarkLogEntry,
} from "./types.ts";

import {
  DEFAULT_MANAGER_LOG_PATH,
  type ManagerLogAck,
  type ManagerLogEnvelope,
  type ManagerLogTransport,
} from "./transport-types.ts";

export type ManagerLogTransportOptions = {
  connection?: HubConnection;

  /**
   * Manager/Hub endpoint accepting signed log events.
   *
   * Default:
   *   /api/staark/logs
   */
  path?: string;
};

function normalizePath(
  value: string | undefined,
): string {
  const path =
    value?.trim() ||
    DEFAULT_MANAGER_LOG_PATH;

  if (!path.startsWith("/")) {
    throw new Error(
      "Manager log endpoint path must start with '/'.",
    );
  }

  return path;
}

function parseAck(
  value: unknown,
  entry: StaarkLogEntry,
): ManagerLogAck {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Manager returned an invalid log acknowledgement.",
    );
  }

  const data =
    value as Record<string, unknown>;

  if (
    data.accepted !== true ||
    typeof data.logId !== "string" ||
    !data.logId.trim()
  ) {
    throw new Error(
      `Manager did not acknowledge log ${entry.id}.`,
    );
  }

  return {
    accepted: true,
    logId: data.logId,
  };
}

export function createManagerLogTransport(
  options: ManagerLogTransportOptions = {},
): ManagerLogTransport {
  const connection =
    options.connection ??
    readStaarkEnv();

  const path =
    normalizePath(
      options.path ??
        process.env
          .STAARK_LOGS_MANAGER_PATH,
    );

  return {
    async send(
      entry: StaarkLogEntry,
    ): Promise<ManagerLogAck> {
      if (
        connection.source !== "hub"
      ) {
        throw new Error(
          "Manager log transport requires a paired Staark Hub connection.",
        );
      }

      const envelope:
        ManagerLogEnvelope = {
          schemaVersion: 1,
          entry,
        };

      const result =
        await hubRequest<unknown>(
          connection,
          path,
          {
            method: "POST",
            body: envelope,
            cache: false,
          },
        );

      return parseAck(
        result,
        entry,
      );
    },
  };
}
