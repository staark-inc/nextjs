export class NewsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsInputError";
  }
}

export const NEWS_KINDS = [
  "feature",
  "improvement",
  "fix",
  "announcement",
  "maintenance",
  "security",
] as const;
export const NEWS_LIMITS = {
  title: 140,
  summary: 240,
  body: 30000,
  ctaLabel: 60,
  url: 2048,
};

/** No raw HTML, protocol-relative URLs, credentials or script/data URLs. */
export function safeNewsUrl(value: string, image = false): string {
  const url = value.trim();
  if (
    !url ||
    /[\u0000-\u0020\u007f\\]/.test(url) ||
    url.length > NEWS_LIMITS.url
  )
    return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (!image && /^#[a-zA-Z0-9_-]+$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return "";
    if (parsed.protocol === "https:" || parsed.protocol === "http:")
      return parsed.href;
    if (!image && ["mailto:", "tel:"].includes(parsed.protocol)) return url;
  } catch {
    /* Invalid URLs are rendered as text. */
  }
  return "";
}

export function parseNewsInput(form: FormData) {
  const text = (key: string) =>
    typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const bounded = (key: keyof typeof NEWS_LIMITS, required = false) => {
    const raw = form.get(key);
    const value = key === "body" && typeof raw === "string" ? raw : text(key);
    if (required && !value.trim())
      throw new NewsInputError(`${key} is required.`);
    if (value.length > NEWS_LIMITS[key])
      throw new NewsInputError(`${key} is too long.`);
    return value;
  };
  const title = bounded("title", true),
    summary = bounded("summary", true),
    body = bounded("body", true);
  const kind = text("kind") || "announcement";
  if (!(NEWS_KINDS as readonly string[]).includes(kind))
    throw new NewsInputError("Invalid update type.");
  const audiencePlan = text("audiencePlan");
  if (audiencePlan && !["STARTER", "SAAS", "BUSINESS"].includes(audiencePlan))
    throw new NewsInputError("Invalid audience.");
  const bodyFormat = text("bodyFormat") || "plain";
  if (!["plain", "markdown"].includes(bodyFormat))
    throw new NewsInputError("Invalid body format.");
  const ctaLabel = bounded("ctaLabel");
  const ctaUrl = text("ctaUrl");
  if (Boolean(ctaLabel) !== Boolean(ctaUrl))
    throw new NewsInputError("Add both a button label and destination.");
  if (ctaUrl && !safeNewsUrl(ctaUrl))
    throw new NewsInputError("Invalid button destination.");
  const coverImageUrl = text("coverImageUrl");
  if (
    coverImageUrl &&
    (!safeNewsUrl(coverImageUrl, true) || coverImageUrl.startsWith("/"))
  )
    throw new NewsInputError("Cover images need a full HTTP(S) URL.");
  return {
    title,
    summary,
    body,
    kind,
    audiencePlan: audiencePlan || null,
    bodyFormat,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl ? safeNewsUrl(ctaUrl) : null,
    coverImageUrl: coverImageUrl || null,
    pinned: form.get("pinned") === "true",
  };
}
