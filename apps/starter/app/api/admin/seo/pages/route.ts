import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function contentDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const dir = contentDir();
  const pagesDir = path.join(dir, "pages");

  try {
    const files = (await readdir(pagesDir)).filter((f) => f.endsWith(".json"));
    const pages = await Promise.all(
      files.map(async (file) => {
        const raw = await readFile(path.join(pagesDir, file), "utf8");
        const data = JSON.parse(raw);
        return {
          file,
          path: data.path ?? "/",
          title: data.title ?? "",
          seoTitle: data.seo?.title ?? "",
          seoDescription: data.seo?.description ?? "",
          hasOg: Boolean(data.seo?.ogImage),
        };
      })
    );
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
