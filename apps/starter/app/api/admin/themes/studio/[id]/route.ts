import { NextResponse } from "next/server";
import {
  deleteStudioTheme,
  readStudioThemeWithBase,
  updateStudioTheme,
} from "@/lib/theme-studio";
import { requireAuth } from "../../../guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    return NextResponse.json(await readStudioThemeWithBase(id));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Theme not found." },
      { status: 404 },
    );
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const theme = await updateStudioTheme(id, body);
    return NextResponse.json({ ok: true, theme });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save theme." },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    await deleteStudioTheme(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Theme not found." },
      { status: 404 },
    );
  }
}
