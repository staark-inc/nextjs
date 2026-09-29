import { NextResponse } from "next/server";
import {
  clearAdminLogs,
  listAdminLogs,
} from "@/lib/admin-logs";
import { requireManager } from "../guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const blocked = await requireManager();
  if (blocked) return blocked;

  const url = new URL(req.url);

  const requested =
    Number(url.searchParams.get("limit")) || 200;

  return NextResponse.json({
    logs: await listAdminLogs(requested),
  });
}

export async function DELETE() {
  const blocked = await requireManager();
  if (blocked) return blocked;

  await clearAdminLogs();

  return NextResponse.json({
    ok: true,
  });
}
