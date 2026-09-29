import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { PageSchema } from "@staark/core";
import {
  AdminPageConflictError,
  AdminPageValidationError,
  adminPagesUsePostgres,
  deletePostgresAdminPage,
  getPostgresAdminSiteSettings,
  readPostgresAdminPage,
  savePostgresAdminPage,
} from "@/lib/admin-page-postgres";
import { createPageRevision } from "@/lib/admin-revisions";
import { upsertRedirect } from "@/lib/admin-redirects";
import { validateBlocks } from "@/lib/block-fields";
import {
  deleteContent,
  readContentJson,
  writeContentJson,
} from "@/lib/storage";
import { requireAuth } from "../../guard";

function safeFile(file: string): string | null {
  if (!file || path.posix.basename(file) !== file || !file.endsWith(".json")) return null;
  return file;
}

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const requested = (await ctx.params).file;

  if (adminPagesUsePostgres()) {
    try {
      const record = await readPostgresAdminPage(requested);
      if (!record) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json(record.page);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message || "Could not load page." },
        { status: 500 },
      );
    }
  }

  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

  try {
    const page = await readContentJson<unknown>(`pages/${file}`);
    if (page === null) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const requested = (await ctx.params).file;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Page must be a JSON object." }, { status: 422 });
  }

  const parsedPage = PageSchema.safeParse(body);
  if (!parsedPage.success) {
    const issue = parsedPage.error.issues[0];
    const field = issue?.path.length ? issue.path.join(".") : "page";
    return NextResponse.json(
      { error: `${field}: ${issue?.message ?? "Invalid page."}` },
      { status: 422 },
    );
  }

  const postgres = adminPagesUsePostgres();
  let activeTheme = "light";
  try {
    if (postgres) {
      const site = await getPostgresAdminSiteSettings();
      activeTheme = site.theme.family ?? "light";
    } else {
      const siteForTheme = await readContentJson<{
        theme?: { family?: string };
      }>("site.json");
      activeTheme = siteForTheme?.theme?.family ?? "light";
    }
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not resolve the active theme." },
      { status: 500 },
    );
  }

  const fieldErrors = validateBlocks(parsedPage.data.blocks, activeTheme);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Some blocks are missing required fields.", fieldErrors }, { status: 422 });
  }

  if (postgres) {
    try {
      const saved = await savePostgresAdminPage(requested, parsedPage.data);
      if (!saved) {
        return NextResponse.json({ error: "Page not found." }, { status: 404 });
      }

      let redirectCreated = false;
      let redirectWarning: string | undefined;
      if (saved.pathChanged) {
        try {
          await upsertRedirect(
            saved.previousPath,
            saved.record.page.path,
            301,
            "page-path-change",
          );
          redirectCreated = true;
        } catch (error) {
          // Redirects remain legacy-owned until their dedicated Storage v2
          // phase. A redirect failure must not pretend the transactional DB
          // page save failed after it has already committed.
          redirectWarning = (error as Error).message || "Could not create redirect.";
          console.warn(
            `[staark] Page ${requested} saved in PostgreSQL, but its legacy redirect could not be written: ${redirectWarning}`,
          );
        }
      }

      revalidatePath("/", "layout");
      revalidatePath(saved.record.page.path);
      if (saved.pathChanged) revalidatePath(saved.previousPath);

      return NextResponse.json({
        ok: true,
        page: saved.record.page,
        redirectCreated,
        ...(redirectWarning ? { redirectWarning } : {}),
      });
    } catch (error) {
      const status = error instanceof AdminPageConflictError
        ? 409
        : error instanceof AdminPageValidationError
          ? 422
          : 500;
      return NextResponse.json(
        { error: (error as Error).message || "Could not save page." },
        { status },
      );
    }
  }

  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

  try {
    const current = await readContentJson<Record<string, unknown>>(`pages/${file}`);
    if (!current) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }
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
    await writeContentJson(`pages/${file}`, saved);
    revalidatePath("/", "layout");
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

  if (adminPagesUsePostgres()) {
    try {
      const deleted = await deletePostgresAdminPage(requested);
      if (!deleted) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      revalidatePath("/", "layout");
      revalidatePath(deleted.page.path);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message || "Could not delete page." },
        { status: 500 },
      );
    }
  }

  const file = safeFile(requested);
  if (!file) return NextResponse.json({ error: "Invalid page file." }, { status: 400 });

  try {
    const page = await readContentJson<{ path?: string }>(`pages/${file}`);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await createPageRevision(file, page as Record<string, unknown>, "before-delete");
    await deleteContent(`pages/${file}`);
    revalidatePath("/", "layout");

    if (page.path) {
      try {
        const site = await readContentJson<{
          navigation?: { primary?: { label: string; href: string }[]; footer?: { label: string; href: string }[]; [key: string]: unknown };
          [key: string]: unknown;
        }>("site.json");

        if (site?.navigation) {
          site.navigation.primary = (site.navigation.primary ?? []).filter((link) => link.href !== page.path);
          site.navigation.footer = (site.navigation.footer ?? []).filter((link) => link.href !== page.path);
          await writeContentJson("site.json", site);
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
