import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  AdminPageConflictError,
  AdminPageNotFoundError,
  adminPagesUsePostgres,
  restorePostgresAdminPageRevision,
} from "@/lib/admin-page-postgres";
import { restorePageRevision } from "@/lib/admin-revisions";
import { requireAuth } from "../../../../../guard";

type Ctx = { params: Promise<{ file: string; id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { file, id } = await ctx.params;
    const page = adminPagesUsePostgres()
      ? await restorePostgresAdminPageRevision(file, id)
      : await restorePageRevision(file, id);
    const pagePath = typeof page.path === "string" ? page.path : "/";
    revalidatePath("/", "layout");
    revalidatePath(pagePath);
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    const status = error instanceof AdminPageNotFoundError
      ? 404
      : error instanceof AdminPageConflictError
        ? 409
        : 400;
    return NextResponse.json(
      { error: (error as Error).message || "Could not restore revision." },
      { status },
    );
  }
}
