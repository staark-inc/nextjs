import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  contentStoragePath,
  listContent,
  readContentJson,
  writeContentJson,
} from "@/lib/storage";
import { requireAuth } from "../guard";

type Link = { label: string; href: string };
type Navigation = { primary: Link[]; footer: Link[]; cta?: Link };

function normalizeHref(value: unknown): string {
  if (typeof value !== "string") throw new Error("Link URL must be text.");
  const href = value.trim().slice(0, 500);
  if (!href) throw new Error("Link URL cannot be empty.");
  if (/^(javascript|data|vbscript):/i.test(href)) throw new Error("Unsafe link URL.");
  if (!/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(href)) {
    throw new Error(`Unsupported link URL: ${href}`);
  }
  return href;
}

function normalizeLink(input: unknown): Link {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid navigation link.");
  }
  const raw = input as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
  if (!label) throw new Error("Link label cannot be empty.");
  return { label, href: normalizeHref(raw.href) };
}

function normalizeList(input: unknown, name: string): Link[] {
  if (!Array.isArray(input)) throw new Error(`${name} navigation must be a list.`);
  if (input.length > 30) throw new Error(`${name} navigation supports up to 30 links.`);
  return input.map(normalizeLink);
}

function normalizeNavigation(input: unknown): Navigation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid navigation payload.");
  }
  const raw = input as Record<string, unknown>;
  const primary = normalizeList(raw.primary ?? [], "Primary");
  const footer = normalizeList(raw.footer ?? [], "Footer");
  const cta = raw.cta ? normalizeLink(raw.cta) : undefined;
  return { primary, footer, ...(cta ? { cta } : {}) };
}

async function pageFiles(): Promise<string[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  return (await listContent("pages"))
    .map((entry) => entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "")
    .filter((file) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort();
}

async function pageOptions(): Promise<Array<{ path: string; title: string }>> {
  try {
    const files = await pageFiles();
    const pages = await Promise.all(files.map(async (file) => {
      try {
        const page = await readContentJson<Record<string, unknown>>(`pages/${file}`);
        if (!page) return null;
        return {
          path: typeof page.path === "string" ? page.path : "",
          title: typeof page.title === "string" ? page.title : file.replace(/\.json$/i, ""),
        };
      } catch {
        return null;
      }
    }));
    return pages.filter((page): page is { path: string; title: string } => Boolean(page?.path));
  } catch {
    return [];
  }
}

function internalPath(href: string): string | null {
  if (!href.startsWith("/")) return null;
  return href.split(/[?#]/, 1)[0] || "/";
}

function warnings(navigation: Navigation, pages: Array<{ path: string }>): string[] {
  const known = new Set(["/", ...pages.map((page) => page.path)]);
  const out: string[] = [];

  for (const [name, links] of [["Header", navigation.primary], ["Footer", navigation.footer]] as const) {
    const seen = new Set<string>();
    for (const link of links) {
      if (seen.has(link.href)) out.push(`${name}: duplicate link to ${link.href}`);
      seen.add(link.href);
      const target = internalPath(link.href);
      if (target && !known.has(target)) out.push(`${name}: ${link.label} points to missing page ${target}`);
    }
  }

  if (navigation.cta) {
    const target = internalPath(navigation.cta.href);
    if (target && !known.has(target)) out.push(`CTA points to missing page ${target}`);
  }
  return out;
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const [site, pages] = await Promise.all([
    readContentJson<Record<string, unknown>>("site.json"),
    pageOptions(),
  ]);
  if (!site) {
    return NextResponse.json({ error: "Site settings not found." }, { status: 404 });
  }

  const navigation = normalizeNavigation(site.navigation ?? { primary: [], footer: [] });
  return NextResponse.json({ navigation, pages, warnings: warnings(navigation, pages) });
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const navigation = normalizeNavigation(body.navigation);
    const [site, pages] = await Promise.all([
      readContentJson<Record<string, unknown>>("site.json"),
      pageOptions(),
    ]);
    if (!site) throw new Error("Site settings not found.");

    site.navigation = navigation;
    await writeContentJson("site.json", site);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, navigation, warnings: warnings(navigation, pages) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save navigation." },
      { status: 422 },
    );
  }
}
