import { NextResponse } from "next/server";
import { readStudioTheme } from "@/lib/theme-studio";
import { requireAuth } from "../../../../guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    const theme = await readStudioTheme(id);
    return new NextResponse(JSON.stringify(theme, null, 2) + "\n", {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${theme.id}.staark-theme.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Theme not found." },
      { status: 404 },
    );
  }
}
