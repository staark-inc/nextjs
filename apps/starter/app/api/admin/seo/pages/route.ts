import { NextResponse } from "next/server";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PageSchema } from "@staark/core";
import { requireAuth } from "../../guard";

function contentDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
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
  const safe = path.basename(file);

  if (!file || safe !== file || !safe.endsWith(".json")) {
    return NextResponse.json({ error: "Invalid page file." }, { status: 400 });
  }

  const pagesDir = path.join(contentDir(), "pages");
  const filePath = path.join(pagesDir, safe);

  try {
    const current = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
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

    await writeFile(filePath, JSON.stringify(parsed.data, null, 2) + "\n", "utf8");
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
