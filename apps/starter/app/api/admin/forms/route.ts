import { NextResponse } from "next/server";
import { clearInbox, listInboxSubmissions } from "@/lib/admin-inbox";
import { requireAuth } from "../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  return NextResponse.json(await listInboxSubmissions());
}

export async function DELETE() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  await clearInbox();
  return NextResponse.json({ ok: true });
}
