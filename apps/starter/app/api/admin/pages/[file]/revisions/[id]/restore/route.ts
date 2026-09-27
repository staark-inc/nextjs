import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { restorePageRevision } from "@/lib/admin-revisions";
import { requireAuth } from "../../../../../guard";

type Ctx = { params: Promise<{ file: string; id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { file, id } = await ctx.params;
    const page = await restorePageRevision(file, id);
    const pagePath = typeof page.path === "string" ? page.path : "/";
    revalidatePath(pagePath);
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not restore revision." },
      { status: 400 },
    );
  }
}
