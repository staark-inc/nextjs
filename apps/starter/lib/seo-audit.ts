import type { Page } from "@staark/core";

export type SeoAuditTone =
  | "good"
  | "warning"
  | "error"
  | "info";

export type SeoAuditCheck = {
  key: string;
  label: string;
  passed: boolean;
  tone: SeoAuditTone;
  message: string;
  points: number;
  maxPoints: number;
};

export type SeoAuditResult = {
  score: number;
  status: "good" | "needs-work" | "poor" | "noindex";
  checks: SeoAuditCheck[];
  internalLinks: number;
  images: number;
  imagesWithAlt: number;
};

type ScanResult = {
  internalLinks: number;
  images: number;
  imagesWithAlt: number;
};

function scanContent(value: unknown): ScanResult {
  const result: ScanResult = {
    internalLinks: 0,
    images: 0,
    imagesWithAlt: 0,
  };

  function visit(input: unknown) {
    if (!input) return;

    if (Array.isArray(input)) {
      for (const item of input) visit(item);
      return;
    }

    if (
      typeof input !== "object"
    ) {
      return;
    }

    const object =
      input as Record<string, unknown>;

    const href =
      typeof object.href === "string"
        ? object.href
        : null;

    if (
      href &&
      href.startsWith("/") &&
      !href.startsWith("//")
    ) {
      result.internalLinks += 1;
    }

    const imageSource =
      ["src", "image", "imageUrl", "url"].some(
        (key) => {
          const candidate = object[key];

          return (
            typeof candidate === "string" &&
            (
              candidate.startsWith("/uploads/") ||
              candidate.startsWith("/media/") ||
              /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(candidate)
            )
          );
        },
      );

    if (imageSource) {
      result.images += 1;

      if (
        typeof object.alt === "string" &&
        object.alt.trim().length > 0
      ) {
        result.imagesWithAlt += 1;
      }
    }

    for (const child of Object.values(object)) {
      visit(child);
    }
  }

  visit(value);

  return result;
}

function cleanPath(path: string): boolean {
  if (path === "/") return true;

  return (
    path.length <= 80 &&
    path === path.toLowerCase() &&
    !path.includes(" ") &&
    !/[?#]/.test(path)
  );
}

export function auditPageSeo(
  page: Page,
  options: {
    defaultOgImage?: string;
  } = {},
): SeoAuditResult {
  const title =
    page.seo.title?.trim() ?? "";

  const description =
    page.seo.description?.trim() ?? "";

  const ogImage =
    page.seo.ogImage?.trim() ||
    options.defaultOgImage?.trim() ||
    "";

  const content =
    scanContent(page.blocks);

  const checks: SeoAuditCheck[] = [];

  function check(input: SeoAuditCheck) {
    checks.push(input);
  }

  check({
    key: "title-present",
    label: "SEO title",
    passed: title.length > 0,
    tone: title ? "good" : "error",
    message: title
      ? "SEO title is set."
      : "Add a unique SEO title.",
    points: title ? 10 : 0,
    maxPoints: 10,
  });

  const titleLengthGood =
    title.length >= 30 &&
    title.length <= 60;

  check({
    key: "title-length",
    label: "Title length",
    passed: titleLengthGood,
    tone:
      titleLengthGood
        ? "good"
        : "warning",
    message:
      title.length === 0
        ? "No SEO title to evaluate."
        : `${title.length} characters. Aim for roughly 30–60.`,
    points: titleLengthGood ? 10 : 0,
    maxPoints: 10,
  });

  check({
    key: "description-present",
    label: "Meta description",
    passed: description.length > 0,
    tone:
      description
        ? "good"
        : "error",
    message:
      description
        ? "Meta description is set."
        : "Add a meta description.",
    points: description ? 10 : 0,
    maxPoints: 10,
  });

  const descriptionLengthGood =
    description.length >= 70 &&
    description.length <= 160;

  check({
    key: "description-length",
    label: "Description length",
    passed: descriptionLengthGood,
    tone:
      descriptionLengthGood
        ? "good"
        : "warning",
    message:
      description.length === 0
        ? "No description to evaluate."
        : `${description.length} characters. Aim for roughly 70–160.`,
    points:
      descriptionLengthGood
        ? 10
        : 0,
    maxPoints: 10,
  });

  check({
    key: "og-image",
    label: "Social image",
    passed: Boolean(ogImage),
    tone:
      ogImage
        ? "good"
        : "warning",
    message:
      ogImage
        ? "Open Graph image is available."
        : "Add an Open Graph image.",
    points: ogImage ? 10 : 0,
    maxPoints: 10,
  });

  const pathGood =
    cleanPath(page.path);

  check({
    key: "path",
    label: "URL",
    passed: pathGood,
    tone:
      pathGood
        ? "good"
        : "warning",
    message:
      pathGood
        ? "URL is clean and search-friendly."
        : "Keep the URL short, lowercase and readable.",
    points: pathGood ? 10 : 0,
    maxPoints: 10,
  });

  const hasContent =
    page.blocks.length > 0;

  check({
    key: "content",
    label: "Page content",
    passed: hasContent,
    tone:
      hasContent
        ? "good"
        : "error",
    message:
      hasContent
        ? `${page.blocks.length} content block${
            page.blocks.length === 1 ? "" : "s"
          }.`
        : "Page has no content blocks.",
    points: hasContent ? 10 : 0,
    maxPoints: 10,
  });

  const altGood =
    content.images === 0 ||
    content.imagesWithAlt ===
      content.images;

  check({
    key: "image-alt",
    label: "Image alt text",
    passed: altGood,
    tone:
      altGood
        ? "good"
        : "warning",
    message:
      content.images === 0
        ? "No content images detected."
        : `${content.imagesWithAlt}/${content.images} detected images have alt text.`,
    points: altGood ? 10 : 0,
    maxPoints: 10,
  });

  const linksGood =
    content.internalLinks > 0 ||
    page.path === "/";

  check({
    key: "internal-links",
    label: "Internal links",
    passed: linksGood,
    tone:
      linksGood
        ? "good"
        : "info",
    message:
      content.internalLinks > 0
        ? `${content.internalLinks} internal link${
            content.internalLinks === 1
              ? ""
              : "s"
          } detected.`
        : "No internal links detected in page content.",
    points: linksGood ? 10 : 0,
    maxPoints: 10,
  });

  const earned =
    checks.reduce(
      (sum, item) =>
        sum + item.points,
      0,
    );

  const possible =
    checks.reduce(
      (sum, item) =>
        sum + item.maxPoints,
      0,
    );

  const score =
    possible > 0
      ? Math.round(
          (earned / possible) * 100,
        )
      : 0;

  return {
    score,
    status:
      page.seo.noindex
        ? "noindex"
        : score >= 85
          ? "good"
          : score >= 60
            ? "needs-work"
            : "poor",
    checks,
    internalLinks:
      content.internalLinks,
    images: content.images,
    imagesWithAlt:
      content.imagesWithAlt,
  };
}
