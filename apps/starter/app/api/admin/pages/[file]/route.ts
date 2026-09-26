import { NextResponse } from "next/server";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "../../guard";

function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

function pagesDir(): string {
  return path.join(contentRoot(), "pages");
}

function sitePath(): string {
  return path.join(contentRoot(), "site.json");
}

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
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
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const { file } = await ctx.params;
  const body = await req.json();
  await writeFile(path.join(pagesDir(), file), JSON.stringify(body, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const { file } = await ctx.params;
  const filePath = path.join(pagesDir(), file);

  try {
    const page = JSON.parse(await readFile(filePath, "utf8")) as { path?: string };
    await unlink(filePath);

    if (page.path) {
      try {
        const site = JSON.parse(await readFile(sitePath(), "utf8")) as {
          navigation?: { primary?: { label: string; href: string }[]; footer?: { label: string; href: string }[]; [key: string]: unknown };
          [key: string]: unknown;
        };
        if (site.navigation) {
          site.navigation.primary = (site.navigation.primary ?? []).filter((link) => link.href !== page.path);
          site.navigation.footer = (site.navigation.footer ?? []).filter((link) => link.href !== page.path);
          await writeFile(sitePath(), JSON.stringify(site, null, 2) + "\n", "utf8");
        }
      } catch {
        // Page deletion should still succeed if navigation cleanup cannot be completed.
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
}
