import { NextResponse } from "next/server";
import { importStudioTheme } from "@/lib/theme-studio";
import { requireAuth } from "../../../guard";

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as {
      document?: unknown;
      onConflict?: "copy" | "replace" | "reject";
    };

    const theme = await importStudioTheme(body.document, body.onConflict ?? "copy");
    return NextResponse.json({ ok: true, theme }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message || "Could not import theme.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
