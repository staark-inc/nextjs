import {
  listAdminLogs,
  type AdminLogLevel,
} from "@/lib/admin-logs";

import {
  requireManager,
} from "../../guard";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const LEVELS:
  AdminLogLevel[] = [
    "debug",
    "info",
    "warning",
    "error",
    "critical",
  ];

function validLevel(
  value: string | null,
): AdminLogLevel | undefined {
  if (!value) {
    return undefined;
  }

  return LEVELS.includes(
    value as AdminLogLevel,
  )
    ? value as AdminLogLevel
    : undefined;
}

export async function GET(
  request: Request,
) {
  const blocked =
    await requireManager();

  if (blocked) {
    return blocked;
  }

  const url =
    new URL(
      request.url,
    );

  const level =
    validLevel(
      url.searchParams.get(
        "level",
      ),
    );

  const area =
    url.searchParams.get(
      "area",
    )?.trim();

  const search =
    url.searchParams.get(
      "q",
    )?.trim();

  const from =
    url.searchParams.get(
      "from",
    )?.trim();

  const to =
    url.searchParams.get(
      "to",
    )?.trim();

  const logs =
    await listAdminLogs({
      limit: 5_000,

      ...(level
        ? { level }
        : {}),

      ...(area
        ? { area }
        : {}),

      ...(search
        ? { search }
        : {}),

      ...(from
        ? { from }
        : {}),

      ...(to
        ? { to }
        : {}),
    });

  const body =
    logs.length
      ? `${
          logs
            .map(
              (entry) =>
                JSON.stringify(
                  entry,
                ),
            )
            .join("\n")
        }\n`
      : "";

  const day =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );

  return new Response(
    body,
    {
      headers: {
        "Content-Type":
          "application/x-ndjson; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="staark-manager-logs-${day}.jsonl"`,

        "Cache-Control":
          "no-store",
      },
    },
  );
}
