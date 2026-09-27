import { NextResponse } from "next/server";
import { deleteBackup } from "@/lib/admin-backups";
import { requireAuth } from "../../guard";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    await deleteBackup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Backup not found." },
      { status: 404 },
    );
  }
}
