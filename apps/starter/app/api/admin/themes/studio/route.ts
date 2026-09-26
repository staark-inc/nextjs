import { NextResponse } from "next/server";
import { createStudioTheme, listStudioThemes } from "@/lib/theme-studio";
import { requireAuth } from "../../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  return NextResponse.json({ themes: await listStudioThemes() });
}

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const theme = await createStudioTheme(body);
    return NextResponse.json({ ok: true, theme }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message || "Could not create theme.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
