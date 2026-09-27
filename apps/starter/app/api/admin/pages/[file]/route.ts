import { NextResponse } from "next/server";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPageRevision } from "@/lib/admin-revisions";
import { upsertRedirect } from "@/lib/admin-redirects";
import { validateBlocks } from "@/lib/block-fields";
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

function safeFile(file: string): string | null {
  if (!file || path.basename(file) !== file || !file.endsWith(".json")) return null;
  return file;
}

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const requested = (await ctx.params).file;
  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

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

  const requested = (await ctx.params).file;
  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Page must be a JSON object." }, { status: 422 });
  }

  // Required-field validation (authoritative; the editor validates too).
  const blocks = (body as { blocks?: { id: string; type: string; props: Record<string, unknown> }[] }).blocks ?? [];
  const fieldErrors = validateBlocks(blocks);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Some blocks are missing required fields.", fieldErrors }, { status: 422 });
  }

  const filePath = path.join(pagesDir(), file);
  try {
    const current = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
    const incoming = body as Record<string, unknown>;

    const currentPath = typeof current.path === "string" ? current.path : "";
    const incomingPath = typeof incoming.path === "string" ? incoming.path : "";

    if (currentPath && incomingPath && currentPath !== incomingPath) {
      await upsertRedirect(currentPath, incomingPath, 301, "page-path-change");
    }

    const currentComparable = { ...current };
    const incomingComparable = { ...incoming };
    delete currentComparable.updatedAt;
    delete incomingComparable.updatedAt;
    if (JSON.stringify(currentComparable) !== JSON.stringify(incomingComparable)) {
      await createPageRevision(file, current, "before-save");
    }

    const saved = { ...incoming, updatedAt: new Date().toISOString() };
    await writeFile(filePath, JSON.stringify(saved, null, 2) + "\n", "utf8");
    return NextResponse.json({ ok: true, page: saved, redirectCreated: currentPath && incomingPath && currentPath !== incomingPath });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save page." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const requested = (await ctx.params).file;
  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

  const filePath = path.join(pagesDir(), file);

  try {
    const page = JSON.parse(await readFile(filePath, "utf8")) as { path?: string };
    await createPageRevision(file, page as Record<string, unknown>, "before-delete");
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
