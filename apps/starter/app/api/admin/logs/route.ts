import {
  NextResponse,
} from "next/server";

import {
  clearAdminLogs,
  getAdminLogStats,
  listAdminLogs,
  type AdminLogLevel,
} from "@/lib/admin-logs";

import {
  requireManager,
} from "../guard";

export const runtime =
  "nodejs";

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
  req: Request,
) {
  const blocked =
    await requireManager();

  if (blocked) {
    return blocked;
  }

  const url =
    new URL(
      req.url,
    );

  const requested =
    Number(
      url.searchParams.get(
        "limit",
      ),
    ) || 200;

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

  const [
    logs,
    stats,
  ] =
    await Promise.all([
      listAdminLogs({
        limit:
          Math.max(
            1,
            Math.min(
              requested,
              5_000,
            ),
          ),

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
      }),

      getAdminLogStats({
        ...(from
          ? { from }
          : {}),

        ...(to
          ? { to }
          : {}),
      }),
    ]);

  return NextResponse.json(
    {
      logs,
      stats,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function DELETE() {
  const blocked =
    await requireManager();

  if (blocked) {
    return blocked;
  }

  await clearAdminLogs();

  return NextResponse.json({
    ok: true,
  });
}
