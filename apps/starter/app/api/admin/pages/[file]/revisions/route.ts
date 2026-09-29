import { NextResponse } from "next/server";
import {
  AdminPageNotFoundError,
  adminPagesUsePostgres,
  listPostgresAdminPageRevisions,
} from "@/lib/admin-page-postgres";
import { listPageRevisions } from "@/lib/admin-revisions";
import { requireAuth } from "../../../guard";

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { file } = await ctx.params;
    const revisions = adminPagesUsePostgres()
      ? await listPostgresAdminPageRevisions(file)
      : await listPageRevisions(file);
    return NextResponse.json({ revisions });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not load revisions." },
      { status: error instanceof AdminPageNotFoundError ? 404 : 400 },
    );
  }
}
