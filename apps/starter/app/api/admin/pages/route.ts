import { NextResponse } from "next/server";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../guard";

function pagesDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return path.join(base, "pages");
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const dir = pagesDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const pages = await Promise.all(
    files.map(async (file) => {
      const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
      return { file, path: raw.path, title: raw.title };
    }),
  );
  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const body = await req.json();
  const slug = (body.path as string).replace(/^\//, "") || "index";
  const file = slug.replace(/\//g, "-") + ".json";
  await writeFile(path.join(pagesDir(), file), JSON.stringify(body, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true, file });
}
