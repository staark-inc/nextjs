import { NextRequest, NextResponse } from "next/server";
import { getAdminShellStatus } from "@/lib/admin-shell-status";
import { requireAuth } from "../../guard";

export const dynamic = "force-dynamic";

/** Badge counts and site status for the admin sidebar and top bar. */
export async function GET(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const refreshHealth = req.nextUrl.searchParams.get("refresh") === "health";
  return NextResponse.json(await getAdminShellStatus({ refreshHealth }), {
    headers: { "Cache-Control": "no-store" },
  });
}
