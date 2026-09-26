import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../guard";

function sitePath(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return path.join(base, "site.json");
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const raw = await readFile(sitePath(), "utf8");
  return NextResponse.json(JSON.parse(raw));
}

export async function PUT(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const body = await req.json();
  await writeFile(sitePath(), JSON.stringify(body, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}
