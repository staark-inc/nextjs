import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { restoreBackup } from "@/lib/admin-backups";
import { requireAuth } from "../../../guard";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    const result = await restoreBackup(id);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not restore backup." },
      { status: 400 },
    );
  }
}
