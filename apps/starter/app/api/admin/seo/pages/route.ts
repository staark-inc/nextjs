import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { PageSchema } from "@staark/core";
import {
  adminPagesUsePostgres,
  listPostgresAdminPages,
  readPostgresAdminPage,
  savePostgresAdminPage,
} from "@/lib/admin-page-postgres";
import {
  contentStoragePath,
  listContent,
  readContentJson,
  writeContentJson,
} from "@/lib/storage";
import { requireAuth } from "../../guard";

export const dynamic = "force-dynamic";

async function pageFiles(): Promise<string[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  return (await listContent("pages"))
    .map((entry) => entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "")
    .filter((file) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort();
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  if (adminPagesUsePostgres()) {
    try {
      const { pages: summaries } = await listPostgresAdminPages();
      const pages = await Promise.all(
        summaries.map(async (summary) => {
          const record = await readPostgresAdminPage(summary.file);
          if (!record) return null;
          const data = record.page;
          return {
            file: record.id,
            path: data.path,
            title: data.title,
            seoTitle: data.seo.title ?? "",
            seoDescription: data.seo.description ?? "",
            ogImage: data.seo.ogImage ?? "",
            noindex: Boolean(data.seo.noindex),
            updatedAt: data.updatedAt ?? record.updatedAt ?? "",
            hasOg: Boolean(data.seo.ogImage),
          };
        }),
      );
      return NextResponse.json({
        pages: pages.filter((page) => page !== null),
      });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message, pages: [] },
        { status: 500 },
      );
    }
  }

  try {
    const files = await pageFiles();
    const pages = await Promise.all(
      files.map(async (file) => {
        const data = await readContentJson<{
          path?: string;
          title?: string;
          seo?: {
            title?: string;
            description?: string;
            ogImage?: string;
            noindex?: boolean;
          };
          updatedAt?: string;
        }>(`pages/${file}`);

        if (!data) throw new Error(`Page ${file} disappeared while reading SEO data.`);
        return {
          file,
          path: data.path ?? "/",
          title: data.title ?? "",
          seoTitle: data.seo?.title ?? "",
          seoDescription: data.seo?.description ?? "",
          ogImage: data.seo?.ogImage ?? "",
          noindex: Boolean(data.seo?.noindex),
          updatedAt: data.updatedAt ?? "",
          hasOg: Boolean(data.seo?.ogImage),
        };
      })
    );
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const file = typeof body.file === "string" ? body.file : "";
  const safe = path.posix.basename(file);

  if (!file || safe !== file || !safe.endsWith(".json")) {
    return NextResponse.json({ error: "Invalid page file." }, { status: 400 });
  }

  if (adminPagesUsePostgres()) {
    try {
      const record = await readPostgresAdminPage(file);
      if (!record) {
        return NextResponse.json({ error: "Page not found." }, { status: 404 });
      }

      const candidate = {
        ...record.page,
        seo: {
          ...record.page.seo,
          title: clean(body.title, 120),
          description: clean(body.description, 320),
          ogImage: clean(body.ogImage, 500),
          noindex: body.noindex === true,
        },
        updatedAt: new Date().toISOString(),
      };

      const parsed = PageSchema.safeParse(candidate);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid page SEO." },
          { status: 422 },
        );
      }

      const saved = await savePostgresAdminPage(file, parsed.data);
      if (!saved) {
        return NextResponse.json({ error: "Page not found." }, { status: 404 });
      }

      revalidatePath("/", "layout");
      return NextResponse.json({
        ok: true,
        page: {
          file,
          path: saved.record.page.path,
          title: saved.record.page.title,
          seoTitle: saved.record.page.seo.title ?? "",
          seoDescription: saved.record.page.seo.description ?? "",
          ogImage: saved.record.page.seo.ogImage ?? "",
          noindex: Boolean(saved.record.page.seo.noindex),
          updatedAt: saved.record.page.updatedAt ?? saved.record.updatedAt ?? "",
          hasOg: Boolean(saved.record.page.seo.ogImage),
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message || "Page not found." },
        { status: 500 },
      );
    }
  }

  try {
    const current = await readContentJson<Record<string, unknown>>(`pages/${safe}`);
    if (!current) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const currentSeo =
      current.seo && typeof current.seo === "object" && !Array.isArray(current.seo)
        ? (current.seo as Record<string, unknown>)
        : {};

    const candidate = {
      ...current,
      seo: {
        ...currentSeo,
        title: clean(body.title, 120),
        description: clean(body.description, 320),
        ogImage: clean(body.ogImage, 500),
        noindex: body.noindex === true,
      },
      updatedAt: new Date().toISOString(),
    };

    const parsed = PageSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid page SEO." },
        { status: 422 },
      );
    }

    await writeContentJson(`pages/${safe}`, parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      page: {
        file: safe,
        path: parsed.data.path,
        title: parsed.data.title,
        seoTitle: parsed.data.seo.title ?? "",
        seoDescription: parsed.data.seo.description ?? "",
        ogImage: parsed.data.seo.ogImage ?? "",
        noindex: parsed.data.seo.noindex,
        updatedAt: parsed.data.updatedAt ?? "",
        hasOg: Boolean(parsed.data.seo.ogImage),
      },
    });
  } catch {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }
}
