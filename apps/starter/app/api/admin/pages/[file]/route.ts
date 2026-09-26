import { NextResponse } from "next/server";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../../guard";

function pagesDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return path.join(base, "pages");
}

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { file } = await ctx.params;
  const filePath = path.join(pagesDir(), file);
  try {
    const raw = await readFile(filePath, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { file } = await ctx.params;
  const body = await req.json();
  await writeFile(path.join(pagesDir(), file), JSON.stringify(body, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { file } = await ctx.params;
  try {
    await unlink(path.join(pagesDir(), file));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
}
