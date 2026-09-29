import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SiteSettingsSchema } from "@staark/core";
import {
  listAdminPageOptions,
  mutateAdminSiteSettings,
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";
import { requireAuth } from "../guard";

type Link = { label: string; href: string };
type FooterColumn = { title: string; links: Link[] };
type Navigation = {
  primary: Link[];
  footer: Link[];
  footerColumns: FooterColumn[];
  cta?: Link;
};

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

function normalizeFooterColumns(input: unknown): FooterColumn[] {
  if (!Array.isArray(input)) throw new Error("Footer columns must be a list.");
  if (input.length > 4) throw new Error("Footer supports up to 4 columns.");

  return input.map((column, index) => {
    if (!column || typeof column !== "object" || Array.isArray(column)) {
      throw new Error(`Footer column ${index + 1} is invalid.`);
    }
    const raw = column as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 80) : "";
    if (!title) throw new Error(`Footer column ${index + 1} needs a title.`);
    const links = normalizeList(raw.links ?? [], `Footer column ${index + 1}`);
    if (links.length > 20) throw new Error(`Footer column ${index + 1} supports up to 20 links.`);
    return { title, links };
  });
}

function normalizeNavigation(input: unknown): Navigation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid navigation payload.");
  }
  const raw = input as Record<string, unknown>;
  const primary = normalizeList(raw.primary ?? [], "Primary");
  const footer = normalizeList(raw.footer ?? [], "Footer");
  const footerColumns = normalizeFooterColumns(raw.footerColumns ?? []);
  const cta = raw.cta ? normalizeLink(raw.cta) : undefined;
  return { primary, footer, footerColumns, ...(cta ? { cta } : {}) };
}

function internalPath(href: string): string | null {
  if (!href.startsWith("/")) return null;
  return href.split(/[?#]/, 1)[0] || "/";
}

function warnings(navigation: Navigation, pages: Array<{ path: string }>): string[] {
  const known = new Set(["/", ...pages.map((page) => page.path)]);
  const out: string[] = [];

  function inspectLinks(name: string, links: Link[]) {
    const seen = new Set<string>();
    for (const link of links) {
      if (seen.has(link.href)) out.push(`${name}: duplicate link to ${link.href}`);
      seen.add(link.href);
      const target = internalPath(link.href);
      if (target && !known.has(target)) out.push(`${name}: ${link.label} points to missing page ${target}`);
    }
  }

  inspectLinks("Header", navigation.primary);
  inspectLinks("Footer", navigation.footer);
  navigation.footerColumns.forEach((column) => inspectLinks(`Footer / ${column.title}`, column.links));

  if (navigation.cta) {
    const target = internalPath(navigation.cta.href);
    if (target && !known.has(target)) out.push(`CTA points to missing page ${target}`);
  }
  return out;
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const [site, pages] = await Promise.all([
      readAdminSiteSettings(),
      listAdminPageOptions(),
    ]);
    const navigation = normalizeNavigation(site.navigation);
    return NextResponse.json({ navigation, pages, warnings: warnings(navigation, pages) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Site settings not found." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const navigation = normalizeNavigation(body.navigation);
    const [site, pages] = await Promise.all([
      mutateAdminSiteSettings((current) =>
        SiteSettingsSchema.parse({ ...current, navigation }),
      ),
      listAdminPageOptions(),
    ]);

    const savedNavigation = normalizeNavigation(site.navigation);
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      navigation: savedNavigation,
      warnings: warnings(savedNavigation, pages),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save navigation." },
      { status: 422 },
    );
  }
}
