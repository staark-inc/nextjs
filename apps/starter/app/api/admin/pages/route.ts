import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  contentExists,
  contentStoragePath,
  listContent,
  readContentJson,
  writeContentJson,
} from "@/lib/storage";
import { resolveThemeRuntime } from "@/lib/theme-runtime";
import { requireAuth } from "../guard";

type NavigationLink = { label: string; href: string };
type SiteFile = {
  theme?: { family?: string };
  navigation?: {
    primary?: NavigationLink[];
    footer?: NavigationLink[];
    cta?: NavigationLink;
  };
  [key: string]: unknown;
};

type PageTemplate = {
  id: string;
  label: string;
  description: string;
  theme?: string;
};

function templatesFor(theme: string): PageTemplate[] {
  const base: PageTemplate[] = [
    { id: "blank", label: "Blank page", description: "Start with an empty page and add blocks manually." },
    { id: "standard", label: "Standard page", description: "Hero, services/content cards and a call to action." },
    { id: "contact", label: "Contact page", description: "Contact introduction and contact form." },
  ];

  if (theme === "salong") {
    base.push(
      { id: "salong-prices", label: "Price page", description: "Hero, salon price list and booking call to action.", theme },
      { id: "salong-gallery", label: "Gallery page", description: "Hero, salon gallery and booking call to action.", theme },
    );
  }
  if (theme === "gastfrihet") {
    base.push(
      { id: "gastfrihet-rooms", label: "Rooms page", description: "Hero, room cards, amenities and contact call to action.", theme },
      { id: "gastfrihet-amenities", label: "Amenities page", description: "Hero, amenities and contact call to action.", theme },
    );
  }
  return base;
}

function block(id: string, type: string, props: Record<string, unknown>) {
  return { id, type, props };
}

function blocksFor(templateId: string, title: string) {
  switch (templateId) {
    case "standard":
      return [
        block("hero", "hero", { heading: title, intro: "Add a short introduction for this page." }),
        block("services", "services", { heading: "What we offer", items: [] }),
        block("cta", "cta", { heading: "Ready to continue?", intro: "Contact us and we will help you with the next step." }),
      ];
    case "contact":
      return [
        block("hero", "hero", { heading: title, intro: "Get in touch and we will respond as soon as possible." }),
        block("contact", "contact", { heading: "Contact us", formId: "contact", submitLabel: "Send" }),
      ];
    case "salong-prices":
      return [
        block("hero", "hero", { heading: title, intro: "Explore our services and prices." }),
        block("prices", "priceList", { heading: "Prices", groups: [] }),
        block("cta", "cta", { heading: "Ready to book?", cta: { label: "Book now", href: "/kontakt" } }),
      ];
    case "salong-gallery":
      return [
        block("hero", "hero", { heading: title, intro: "A selection of our work." }),
        block("gallery", "gallery", { heading: "Gallery", images: [] }),
        block("cta", "cta", { heading: "Like what you see?", cta: { label: "Book now", href: "/kontakt" } }),
      ];
    case "gastfrihet-rooms":
      return [
        block("hero", "hero", { heading: title, intro: "Find the stay that suits you." }),
        block("rooms", "rooms", { heading: "Rooms", rooms: [] }),
        block("amenities", "amenities", { heading: "Amenities", items: [] }),
        block("cta", "cta", { heading: "Plan your stay", cta: { label: "Contact us", href: "/kontakt" } }),
      ];
    case "gastfrihet-amenities":
      return [
        block("hero", "hero", { heading: title, intro: "Everything included in your stay." }),
        block("amenities", "amenities", { heading: "Amenities", items: [] }),
        block("cta", "cta", { heading: "Questions?", cta: { label: "Contact us", href: "/kontakt" } }),
      ];
    default:
      return [];
  }
}

async function readSite(): Promise<SiteFile> {
  const site = await readContentJson<SiteFile>("site.json");
  if (!site) throw new Error("Site settings not found.");
  return site;
}

async function pageFiles(): Promise<string[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  return (await listContent("pages"))
    .map((entry) => entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "")
    .filter((file) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort();
}

async function updateNavigation(pathname: string, label: string, primary: boolean, footer: boolean): Promise<void> {
  const site = await readSite();
  const navigation = site.navigation ?? {};
  const primaryLinks = Array.isArray(navigation.primary) ? navigation.primary : [];
  const footerLinks = Array.isArray(navigation.footer) ? navigation.footer : [];

  const withoutPath = (links: NavigationLink[]) => links.filter((link) => link.href !== pathname);
  navigation.primary = primary ? [...withoutPath(primaryLinks), { label, href: pathname }] : withoutPath(primaryLinks);
  navigation.footer = footer ? [...withoutPath(footerLinks), { label, href: pathname }] : withoutPath(footerLinks);
  site.navigation = navigation;
  await writeContentJson("site.json", site);
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const [site, files] = await Promise.all([
    readSite(),
    pageFiles(),
  ]);
  const primary = site.navigation?.primary ?? [];
  const footer = site.navigation?.footer ?? [];
  const pages = await Promise.all(
    files.map(async (file) => {
      const raw = await readContentJson<{ path?: string; title?: string }>(`pages/${file}`);
      if (!raw) throw new Error(`Page ${file} disappeared while listing pages.`);
      const pathname = raw.path ?? "/";
      return {
        file,
        path: pathname,
        title: raw.title ?? file.replace(/\.json$/, ""),
        inPrimary: primary.some((link) => link.href === pathname),
        inFooter: footer.some((link) => link.href === pathname),
        navigationLabel: primary.find((link) => link.href === pathname)?.label ?? footer.find((link) => link.href === pathname)?.label,
      };
    }),
  );
  const theme = resolveThemeRuntime(site.theme?.family).id;
  return NextResponse.json({ pages, theme, templates: templatesFor(theme) });
}

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const rawPath = typeof body.path === "string" ? body.path.trim() : "";
  const pathname = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : pathname.slice(1) || "Home";

  if (!/^\/[a-z0-9\-/]*$/i.test(pathname)) {
    return NextResponse.json({ error: "Use a URL path such as /about-us." }, { status: 400 });
  }

  const slug = pathname.replace(/^\//, "") || "index";
  const file = slug.replace(/\//g, "-") + ".json";
  const filePath = `pages/${file}`;
  if (await contentExists(filePath)) {
    return NextResponse.json({ error: "A page with this path already exists." }, { status: 409 });
  }

  const site = await readSite();
  const theme = resolveThemeRuntime(site.theme?.family).id;
  const allowedTemplates = templatesFor(theme);
  const requestedTemplate = typeof body.templateId === "string" ? body.templateId : "blank";
  const templateId = allowedTemplates.some((template) => template.id === requestedTemplate) ? requestedTemplate : "blank";
  const page = {
    path: pathname,
    title,
    seo: {},
    blocks: blocksFor(templateId, title),
    updatedAt: new Date().toISOString(),
  };

  await writeContentJson(filePath, page);

  const addToPrimary = body.addToPrimary === true && pathname !== "/";
  const addToFooter = body.addToFooter === true && pathname !== "/";
  if (addToPrimary || addToFooter) {
    const navigationLabel = typeof body.navigationLabel === "string" && body.navigationLabel.trim()
      ? body.navigationLabel.trim()
      : title;
    await updateNavigation(pathname, navigationLabel, addToPrimary, addToFooter);
  }

  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, file, path: pathname });
}
