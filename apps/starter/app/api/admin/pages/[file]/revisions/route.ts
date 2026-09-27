import { NextResponse } from "next/server";
import { listPageRevisions } from "@/lib/admin-revisions";
import { requireAuth } from "../../../guard";

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { file } = await ctx.params;
    return NextResponse.json({ revisions: await listPageRevisions(file) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not load revisions." },
      { status: 400 },
    );
  }
}
