import { backupDownloadName, readBackup } from "@/lib/admin-backups";
import { requireAuth } from "../../../guard";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    const backup = await readBackup(id);
    return new Response(JSON.stringify(backup, null, 2) + "\n", {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backupDownloadName(backup)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Backup not found.", { status: 404 });
  }
}
