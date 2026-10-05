import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { restoreBackup } from "@/lib/admin-backups";
import { requireAuth } from "../../../guard";

import {
  appendAdminAction,
} from "@/lib/admin-audit";

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

    await appendAdminAction({
      level: "warning",
      area: "backup",
      action: "backup.restored",
      message: `Backup "${result.restored.label}" was restored.`,
      resource: "backup",
      resourceId: result.restored.id,
      meta: {
        label:
          result.restored.label,
        safetyBackupId:
          result.safetyBackup.id,
        fileCount:
          result.restored.fileCount,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not restore backup." },
      { status: 400 },
    );
  }
}
