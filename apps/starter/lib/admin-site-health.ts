import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PageSchema, SiteSettingsSchema } from "@staark/core";
import { themeRegistry } from "@/staark.config";
import { buildMediaUsageIndex } from "./admin-media-usage";
import { listRedirects, type RedirectRule } from "./admin-redirects";

export type HealthSeverity = "error" | "warning";
export type HealthCategory =
  | "content"
  | "links"
  | "navigation"
  | "media"
  | "seo"
  | "redirects";

export type HealthIssue = {
  id: string;
  category: HealthCategory;
  severity: HealthSeverity;
  title: string;
  detail: string;
  source?: string;
  href?: string;
};

export type HealthCheck = {
  id: HealthCategory;
  label: string;
  status: "ok" | "warning" | "error";
  issues: number;
};

export type SiteHealthReport = {
  checkedAt: string;
  counts: {
    errors: number;
    warnings: number;
    passed: number;
    checks: number;
  };
  checks: HealthCheck[];
  issues: HealthIssue[];
};

type JsonObject = Record<string, unknown>;

type PageRecord = {
  file: string;
  data: JsonObject;
  path?: string;
  title?: string;
};

type LinkReference = {
  href: string;
  field: string;
};

const CHECK_LABELS: Record<HealthCategory, string> = {
  content: "Content integrity",
  links: "Internal links",
  navigation: "Navigation",
  media: "Media",
  seo: "SEO",
  redirects: "Redirects",
};

const BASE_BLOCK_TYPES = new Set([
  "hero",
  "services",
  "process",
  "testimonials",
  "cta",
  "contact",
]);

const IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i;

function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir)
    ? dir
    : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

function pagesDir(): string {
  return path.join(contentRoot(), "pages");
}

function uploadsDir(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    "uploads",
  );
}

function mediaMetadataFile(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".staark",
    "media.json",
  );
}

function pageEditorHref(file: string): string {
  return `/admin/pages/${encodeURIComponent(file)}`;
}

function normalizeInternalPath(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (
    value.startsWith("/api/") ||
    value.startsWith("/admin/") ||
    value.startsWith("/_next/") ||
    value.startsWith("/uploads/")
  ) {
    return null;
  }

  const [rawPath = "/"] = value.split(/[?#]/u, 1);
  let normalized = rawPath.replace(/\/{2,}/g, "/");
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

function fieldPath(parts: Array<string | number>): string {
  if (!parts.length) return "document";
  return parts
    .map((part, index) =>
      typeof part === "number"
        ? `[${part}]`
        : `${index > 0 ? "." : ""}${part}`,
    )
    .join("");
}

function collectHrefReferences(
  value: unknown,
  parts: Array<string | number>,
  out: LinkReference[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectHrefReferences(item, [...parts, index], out),
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as JsonObject)) {
    const nextParts = [...parts, key];
    if (key.toLowerCase() === "href" && typeof nested === "string") {
      out.push({ href: nested, field: fieldPath(nextParts) });
      continue;
    }
    collectHrefReferences(nested, nextParts, out);
  }
}

function issueId(
  category: HealthCategory,
  source: string,
  code: string,
): string {
  return `${category}:${source}:${code}`;
}

async function readJson(file: string): Promise<JsonObject> {
  return JSON.parse(await readFile(file, "utf8")) as JsonObject;
}

async function readPages(issues: HealthIssue[]): Promise<PageRecord[]> {
  let entries;
  try {
    entries = await readdir(pagesDir(), { withFileTypes: true });
  } catch (error) {
    issues.push({
      id: issueId("content", "pages", "directory-unreadable"),
      category: "content",
      severity: "error",
      title: "Pages directory cannot be read",
      detail: (error as Error).message,
      href: "/admin/pages",
    });
    return [];
  }

  const pages: PageRecord[] = [];

  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name))) {
    const filePath = path.join(pagesDir(), entry.name);
    let data: JsonObject;

    try {
      data = await readJson(filePath);
    } catch (error) {
      issues.push({
        id: issueId("content", entry.name, "invalid-json"),
        category: "content",
        severity: "error",
        title: "Invalid page JSON",
        detail: `${entry.name}: ${(error as Error).message}`,
        source: entry.name,
        href: pageEditorHref(entry.name),
      });
      continue;
    }

    const parsed = PageSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      issues.push({
        id: issueId("content", entry.name, "schema"),
        category: "content",
        severity: "error",
        title: "Page does not match the content schema",
        detail: `${entry.name}: ${first?.path.join(".") || "page"} ${first?.message || "is invalid"}`,
        source: entry.name,
        href: pageEditorHref(entry.name),
      });
    }

    pages.push({
      file: entry.name,
      data,
      path: typeof data.path === "string" ? data.path : undefined,
      title: typeof data.title === "string" ? data.title : undefined,
    });
  }

  return pages;
}

function addPagePathIssues(pages: PageRecord[], issues: HealthIssue[]): void {
  const byPath = new Map<string, PageRecord[]>();

  for (const page of pages) {
    if (!page.path) continue;
    const group = byPath.get(page.path) ?? [];
    group.push(page);
    byPath.set(page.path, group);
  }

  for (const [pagePath, group] of byPath) {
    if (group.length < 2) continue;

    issues.push({
      id: issueId("content", pagePath, "duplicate-path"),
      category: "content",
      severity: "error",
      title: "Duplicate page path",
      detail: `${pagePath} is used by ${group.map((page) => page.file).join(", ")}.`,
      source: pagePath,
      href: "/admin/pages",
    });
  }
}

function addBlockIssues(pages: PageRecord[], issues: HealthIssue[]): void {
  const allowed = new Set(BASE_BLOCK_TYPES);
  for (const key of Object.keys(themeRegistry ?? {})) allowed.add(key);

  for (const page of pages) {
    const blocks = Array.isArray(page.data.blocks) ? page.data.blocks : [];
    blocks.forEach((block, index) => {
      if (!block || typeof block !== "object" || Array.isArray(block)) return;
      const type = (block as JsonObject).type;
      if (typeof type !== "string" || !type.trim()) return;
      if (allowed.has(type)) return;

      issues.push({
        id: issueId("content", page.file, `unknown-block-${index}-${type}`),
        category: "content",
        severity: "error",
        title: "Unknown block type",
        detail: `${page.title ?? page.file} uses "${type}" at blocks[${index}], but the active theme does not register it.`,
        source: `${page.file} · blocks[${index}]`,
        href: pageEditorHref(page.file),
      });
    });
  }
}

function addSeoIssues(
  site: JsonObject,
  pages: PageRecord[],
  knownPaths: Set<string>,
  issues: HealthIssue[],
): void {
  const siteSeo =
    site.seo && typeof site.seo === "object" && !Array.isArray(site.seo)
      ? site.seo as JsonObject
      : {};

  const defaultDescription =
    typeof siteSeo.defaultDescription === "string"
      ? siteSeo.defaultDescription.trim()
      : "";

  if (!defaultDescription) {
    issues.push({
      id: issueId("seo", "site", "default-description"),
      category: "seo",
      severity: "warning",
      title: "Site default description is missing",
      detail: "Pages without their own description have no useful fallback meta description.",
      source: "site.json",
      href: "/admin/seo",
    });
  }

  const publicUrl = typeof site.url === "string" ? site.url : "";
  if (publicUrl) {
    try {
      const parsed = new URL(publicUrl);
      if (parsed.hostname.endsWith(".example")) {
        issues.push({
          id: issueId("seo", "site", "placeholder-url"),
          category: "seo",
          severity: "warning",
          title: "Public site URL is still a placeholder",
          detail: `${publicUrl} uses the reserved .example domain.`,
          source: "site.json",
          href: "/admin/site",
        });
      }
    } catch {
      // SiteSettingsSchema reports the invalid URL as a content issue.
    }
  }

  for (const page of pages) {
    const seo =
      page.data.seo && typeof page.data.seo === "object" && !Array.isArray(page.data.seo)
        ? page.data.seo as JsonObject
        : {};
    const noindex = seo.noindex === true;
    if (noindex) continue;

    const seoTitle = typeof seo.title === "string" ? seo.title.trim() : "";
    const description =
      typeof seo.description === "string" ? seo.description.trim() : "";

    if (!seoTitle) {
      issues.push({
        id: issueId("seo", page.file, "title"),
        category: "seo",
        severity: "warning",
        title: "SEO title is missing",
        detail: `${page.title ?? page.file} has no explicit SEO title.`,
        source: page.file,
        href: pageEditorHref(page.file),
      });
    }

    if (!description) {
      issues.push({
        id: issueId("seo", page.file, "description"),
        category: "seo",
        severity: "warning",
        title: "Meta description is missing",
        detail: `${page.title ?? page.file} has no page-specific meta description.`,
        source: page.file,
        href: pageEditorHref(page.file),
      });
    }

    const canonical =
      typeof seo.canonical === "string" ? seo.canonical.trim() : "";

    if (canonical) {
      if (canonical.startsWith("/")) {
        const target = normalizeInternalPath(canonical);
        if (target && !knownPaths.has(target)) {
          issues.push({
            id: issueId("seo", page.file, "canonical-target"),
            category: "seo",
            severity: "warning",
            title: "Canonical points to a missing internal page",
            detail: `${canonical} does not match a current page path.`,
            source: page.file,
            href: pageEditorHref(page.file),
          });
        }
      } else {
        try {
          const parsed = new URL(canonical);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("unsupported protocol");
          }
        } catch {
          issues.push({
            id: issueId("seo", page.file, "canonical-invalid"),
            category: "seo",
            severity: "warning",
            title: "Canonical URL is invalid",
            detail: `${page.title ?? page.file} has canonical "${canonical}".`,
            source: page.file,
            href: pageEditorHref(page.file),
          });
        }
      }
    }
  }
}

function addNavigationIssues(
  site: JsonObject,
  knownPaths: Set<string>,
  activeRedirects: Map<string, RedirectRule>,
  issues: HealthIssue[],
): void {
  const navigation =
    site.navigation && typeof site.navigation === "object" && !Array.isArray(site.navigation)
      ? site.navigation as JsonObject
      : {};

  const groups: Array<[string, unknown]> = [
    ["Header", navigation.primary],
    ["Footer", navigation.footer],
  ];

  for (const [label, rawLinks] of groups) {
    if (!Array.isArray(rawLinks)) continue;
    const seen = new Set<string>();

    rawLinks.forEach((rawLink, index) => {
      if (!rawLink || typeof rawLink !== "object" || Array.isArray(rawLink)) return;
      const link = rawLink as JsonObject;
      const href = typeof link.href === "string" ? link.href : "";
      const linkLabel = typeof link.label === "string" ? link.label : `Item ${index + 1}`;

      if (href && seen.has(href)) {
        issues.push({
          id: issueId("navigation", label, `duplicate-${href}-${index}`),
          category: "navigation",
          severity: "warning",
          title: `${label} contains a duplicate link`,
          detail: `${linkLabel} repeats ${href}.`,
          source: `${label} navigation`,
          href: "/admin/navigation",
        });
      }
      if (href) seen.add(href);

      const target = normalizeInternalPath(href);
      if (!target) return;

      if (activeRedirects.has(target)) {
        issues.push({
          id: issueId("navigation", label, `redirect-${target}-${index}`),
          category: "navigation",
          severity: "warning",
          title: "Navigation points to a redirect",
          detail: `${linkLabel} links to ${target}. Update it to the final destination instead.`,
          source: `${label} navigation`,
          href: "/admin/navigation",
        });
        return;
      }

      if (!knownPaths.has(target)) {
        issues.push({
          id: issueId("navigation", label, `missing-${target}-${index}`),
          category: "navigation",
          severity: "error",
          title: "Navigation points to a missing page",
          detail: `${linkLabel} points to ${target}, which is not a current page.`,
          source: `${label} navigation`,
          href: "/admin/navigation",
        });
      }
    });
  }

  const cta =
    navigation.cta && typeof navigation.cta === "object" && !Array.isArray(navigation.cta)
      ? navigation.cta as JsonObject
      : null;

  if (cta && typeof cta.href === "string") {
    const target = normalizeInternalPath(cta.href);
    if (target && activeRedirects.has(target)) {
      issues.push({
        id: issueId("navigation", "cta", `redirect-${target}`),
        category: "navigation",
        severity: "warning",
        title: "Navigation CTA points to a redirect",
        detail: `CTA links to ${target}. Update it to the final destination instead.`,
        source: "Navigation CTA",
        href: "/admin/navigation",
      });
    } else if (target && !knownPaths.has(target)) {
      issues.push({
        id: issueId("navigation", "cta", `missing-${target}`),
        category: "navigation",
        severity: "error",
        title: "Navigation CTA points to a missing page",
        detail: `CTA points to ${target}, which is not a current page.`,
        source: "Navigation CTA",
        href: "/admin/navigation",
      });
    }
  }
}

function addPageLinkIssues(
  pages: PageRecord[],
  knownPaths: Set<string>,
  activeRedirects: Map<string, RedirectRule>,
  issues: HealthIssue[],
): void {
  for (const page of pages) {
    const references: LinkReference[] = [];
    collectHrefReferences(page.data.blocks ?? [], ["blocks"], references);

    for (const reference of references) {
      const target = normalizeInternalPath(reference.href);
      if (!target) continue;

      if (activeRedirects.has(target)) {
        issues.push({
          id: issueId("links", page.file, `redirect-${reference.field}-${target}`),
          category: "links",
          severity: "warning",
          title: "Internal link points to a redirect",
          detail: `${page.title ?? page.file} links to ${target} at ${reference.field}. Link directly to the final page instead.`,
          source: `${page.file} · ${reference.field}`,
          href: pageEditorHref(page.file),
        });
        continue;
      }

      if (!knownPaths.has(target)) {
        issues.push({
          id: issueId("links", page.file, `missing-${reference.field}-${target}`),
          category: "links",
          severity: "error",
          title: "Broken internal link",
          detail: `${page.title ?? page.file} links to missing page ${target} at ${reference.field}.`,
          source: `${page.file} · ${reference.field}`,
          href: pageEditorHref(page.file),
        });
      }
    }
  }
}

function redirectTargetPath(target: string): string | null {
  return normalizeInternalPath(target);
}

function addRedirectIssues(
  redirects: RedirectRule[],
  redirectIssues: Awaited<ReturnType<typeof listRedirects>>["issues"],
  knownPaths: Set<string>,
  issues: HealthIssue[],
): Map<string, RedirectRule> {
  const active = new Map(
    redirects
      .filter((rule) => rule.enabled)
      .map((rule) => [rule.from, rule]),
  );

  for (const redirectIssue of redirectIssues) {
    issues.push({
      id: issueId(
        "redirects",
        redirectIssue.ruleId ?? "global",
        redirectIssue.message,
      ),
      category: "redirects",
      severity: redirectIssue.severity,
      title:
        redirectIssue.severity === "error"
          ? "Redirect configuration error"
          : "Redirect chain detected",
      detail: redirectIssue.message,
      source: redirectIssue.ruleId,
      href: "/admin/redirects",
    });
  }

  for (const rule of redirects.filter((item) => item.enabled)) {
    if (knownPaths.has(rule.from)) {
      issues.push({
        id: issueId("redirects", rule.id, "shadows-page"),
        category: "redirects",
        severity: "error",
        title: "Redirect shadows a live page",
        detail: `${rule.from} is both a page and an active redirect. The redirect wins before the page can render.`,
        source: rule.from,
        href: "/admin/redirects",
      });
    }

    const target = redirectTargetPath(rule.to);
    if (target && !knownPaths.has(target) && !active.has(target)) {
      issues.push({
        id: issueId("redirects", rule.id, "missing-target"),
        category: "redirects",
        severity: "error",
        title: "Redirect destination is missing",
        detail: `${rule.from} redirects to ${target}, but that path is not a page or another active redirect.`,
        source: rule.from,
        href: "/admin/redirects",
      });
    }
  }

  return active;
}

async function addMediaIssues(issues: HealthIssue[]): Promise<void> {
  const usageIndex = await buildMediaUsageIndex();

  let uploadNames: string[] = [];
  try {
    uploadNames = (await readdir(uploadsDir()))
      .filter((name) => IMAGE_EXTENSION.test(name));
  } catch {
    uploadNames = [];
  }

  const available = new Set(uploadNames);

  for (const [name, references] of Object.entries(usageIndex)) {
    if (available.has(name)) continue;
    const first = references[0];

    issues.push({
      id: issueId("media", name, "missing-file"),
      category: "media",
      severity: "error",
      title: "Referenced media file is missing",
      detail: `${name} is referenced ${references.length} time${references.length === 1 ? "" : "s"} but does not exist in public/uploads.`,
      source: first ? `${first.source} · ${first.field}` : name,
      href: first?.href ?? "/admin/media",
    });
  }

  let metadata: Record<string, { alt?: string }> = {};
  try {
    metadata = JSON.parse(await readFile(mediaMetadataFile(), "utf8")) as Record<string, { alt?: string }>;
  } catch {
    metadata = {};
  }

  for (const name of uploadNames.sort()) {
    if (metadata[name]?.alt?.trim()) continue;
    issues.push({
      id: issueId("media", name, "missing-alt"),
      category: "media",
      severity: "warning",
      title: "Media alt text is missing",
      detail: `${name} has no alt text in the media library.`,
      source: name,
      href: "/admin/media",
    });
  }
}

function buildChecks(issues: HealthIssue[]): HealthCheck[] {
  return (Object.keys(CHECK_LABELS) as HealthCategory[]).map((category) => {
    const categoryIssues = issues.filter((issue) => issue.category === category);
    const status = categoryIssues.some((issue) => issue.severity === "error")
      ? "error"
      : categoryIssues.some((issue) => issue.severity === "warning")
        ? "warning"
        : "ok";

    return {
      id: category,
      label: CHECK_LABELS[category],
      status,
      issues: categoryIssues.length,
    };
  });
}

export async function runSiteHealth(): Promise<SiteHealthReport> {
  const issues: HealthIssue[] = [];

  let site: JsonObject = {};
  try {
    site = await readJson(path.join(contentRoot(), "site.json"));
    const parsed = SiteSettingsSchema.safeParse(site);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      issues.push({
        id: issueId("content", "site.json", "schema"),
        category: "content",
        severity: "error",
        title: "Site settings do not match the content schema",
        detail: `${first?.path.join(".") || "site"} ${first?.message || "is invalid"}`,
        source: "site.json",
        href: "/admin/site",
      });
    }
  } catch (error) {
    issues.push({
      id: issueId("content", "site.json", "invalid-json"),
      category: "content",
      severity: "error",
      title: "Site settings cannot be read",
      detail: (error as Error).message,
      source: "site.json",
      href: "/admin/site",
    });
  }

  const pages = await readPages(issues);
  addPagePathIssues(pages, issues);
  addBlockIssues(pages, issues);

  const knownPaths = new Set(
    pages
      .map((page) => page.path)
      .filter((pagePath): pagePath is string => Boolean(pagePath)),
  );
  knownPaths.add("/");

  const redirectState = await listRedirects().catch((error) => {
    issues.push({
      id: issueId("redirects", "storage", "read-failed"),
      category: "redirects",
      severity: "error",
      title: "Redirect storage cannot be read",
      detail: (error as Error).message,
      href: "/admin/redirects",
    });
    return { redirects: [], issues: [] };
  });

  const activeRedirects = addRedirectIssues(
    redirectState.redirects,
    redirectState.issues,
    knownPaths,
    issues,
  );

  addNavigationIssues(site, knownPaths, activeRedirects, issues);
  addPageLinkIssues(pages, knownPaths, activeRedirects, issues);
  addSeoIssues(site, pages, knownPaths, issues);

  try {
    await addMediaIssues(issues);
  } catch (error) {
    issues.push({
      id: issueId("media", "scanner", "failed"),
      category: "media",
      severity: "error",
      title: "Media health check failed",
      detail: (error as Error).message,
      href: "/admin/media",
    });
  }

  const uniqueIssues = issues.filter(
    (issue, index, all) =>
      all.findIndex((candidate) => candidate.id === issue.id) === index,
  );

  uniqueIssues.sort((a, b) => {
    const severity = a.severity === b.severity
      ? 0
      : a.severity === "error"
        ? -1
        : 1;
    if (severity) return severity;
    return `${a.category}:${a.title}`.localeCompare(`${b.category}:${b.title}`);
  });

  const checks = buildChecks(uniqueIssues);
  const errors = uniqueIssues.filter((issue) => issue.severity === "error").length;
  const warnings = uniqueIssues.filter((issue) => issue.severity === "warning").length;
  const passed = checks.filter((check) => check.status === "ok").length;

  return {
    checkedAt: new Date().toISOString(),
    counts: {
      errors,
      warnings,
      passed,
      checks: checks.length,
    },
    checks,
    issues: uniqueIssues,
  };
}
