import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { applyStudioTheme } from "@/lib/theme-studio";
import { requireAuth } from "../../../../guard";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const { id } = await ctx.params;
    const result = await applyStudioTheme(id);
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      id: result.theme.id,
      baseTheme: result.theme.baseTheme,
      sourceBaseTheme: result.theme.baseTheme,
      sourceBasePreset: result.theme.basePreset,
      activeBaseTheme: result.activeBaseTheme,
      appliedPreset: result.appliedPreset,
      crossFamily: result.crossFamily,
      contentDir: result.contentDir,
      restartRequired: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not apply theme." },
      { status: 400 },
    );
  }
}
