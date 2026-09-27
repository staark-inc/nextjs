import { listInboxSubmissions } from "@/lib/admin-inbox";
import { listMediaFiles } from "@/lib/admin-media";
import { readStudioTheme } from "@/lib/theme-studio";
import {
  contentStoragePath,
  listContent,
  readContentJson,
} from "@/lib/storage";

type DashboardPage = {
  file: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  updatedAt: string;
};

type DashboardSite = {
  name?: string;
  theme?: {
    preset?: string;
    studio?: {
      id?: string;
      name?: string;
      sourceUpdatedAt?: string;
    };
    overrides?: {
      colors?: {
        primary?: string;
        surface?: string;
        ink?: string;
      };
    };
  };
};

function seoIssues(page: DashboardPage): string[] {
  if (page.noindex) return [];
  const issues: string[] = [];
  if (!page.seoTitle.trim()) issues.push("missing title");
  if (!page.seoDescription.trim()) issues.push("missing description");
  else if (page.seoDescription.trim().length < 50) issues.push("description too short");
  else if (page.seoDescription.trim().length > 160) issues.push("description too long");
  return issues;
}

function fieldText(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  return typeof value === "string" ? value.trim() : "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { month: "short", day: "numeric" }).format(date);
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14 M13 6l6 6-6 6" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const site = await readContentJson<DashboardSite>("site.json");
  if (!site) throw new Error("Site settings not found in storage.");

  const pagesPrefix = `${contentStoragePath("pages")}/`;
  const pageEntries = (await listContent("pages"))
    .map((entry) => ({
      entry,
      file: entry.path.startsWith(pagesPrefix)
        ? entry.path.slice(pagesPrefix.length)
        : "",
    }))
    .filter(({ file }) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort((a, b) => a.file.localeCompare(b.file));
  const files = pageEntries.map(({ file }) => file);

  const pages: DashboardPage[] = await Promise.all(
    pageEntries.map(async ({ entry, file }) => {
      try {
        const data = await readContentJson<Record<string, unknown>>(`pages/${file}`);
        if (!data) throw new Error("Page object is missing.");
        const seo =
          data.seo && typeof data.seo === "object" && !Array.isArray(data.seo)
            ? (data.seo as Record<string, unknown>)
            : {};

        return {
          file,
          path: typeof data.path === "string" ? data.path : `/${file.replace(/\.json$/i, "")}`,
          title: typeof data.title === "string" ? data.title : file.replace(/\.json$/i, ""),
          seoTitle: typeof seo.title === "string" ? seo.title : "",
          seoDescription: typeof seo.description === "string" ? seo.description : "",
          noindex: seo.noindex === true,
          updatedAt:
            typeof data.updatedAt === "string"
              ? data.updatedAt
              : entry.mtime > 0
                ? new Date(entry.mtime).toISOString()
                : "",
        };
      } catch {
        return {
          file,
          path: `/${file.replace(/\.json$/i, "")}`,
          title: file.replace(/\.json$/i, ""),
          seoTitle: "",
          seoDescription: "",
          noindex: false,
          updatedAt: "",
        };
      }
    }),
  );

  const inbox = await listInboxSubmissions();
  const newInboxCount = inbox.filter((item) => item.status === "new").length;
  const pendingBookingCount = inbox.filter((item) => item.bookingStatus === "pending").length;
  const indexedPages = pages.filter((page) => !page.noindex);
  const seoAttention = indexedPages
    .map((page) => ({ page, issues: seoIssues(page) }))
    .filter((item) => item.issues.length > 0);
  const seoGoodCount = indexedPages.length - seoAttention.length;

  let mediaCount = 0;
  let mediaMissingAlt = 0;
  let mediaBytes = 0;
  try {
    const media = await listMediaFiles();
    mediaCount = media.length;
    mediaMissingAlt = media.filter((file) => !file.alt.trim()).length;
    mediaBytes = media.reduce((sum, file) => sum + file.size, 0);
  } catch {}

  const submissionCount = inbox.length;

  const theme = process.env.STAARK_THEME?.trim() || "salong";
  const source =
    process.env.STAARK_CONTENT_SOURCE?.trim() ||
    (process.env.STAARK_SITE_ID?.trim() && process.env.STAARK_SITE_SECRET?.trim() ? "hub" : "fixtures");
  const mode = process.env.NODE_ENV === "production" ? "Production" : "Development";
  const preset = site.theme?.preset ?? "default";

  const studio =
    site.theme?.studio && typeof site.theme.studio === "object" && !Array.isArray(site.theme.studio)
      ? (site.theme.studio as Record<string, unknown>)
      : null;
  const studioId = studio && typeof studio.id === "string" ? studio.id : "";
  const studioName = studio && typeof studio.name === "string" ? studio.name : "";
  const studioSourceUpdatedAt =
    studio && typeof studio.sourceUpdatedAt === "string" ? studio.sourceUpdatedAt : "";

  let studioPending = false;
  if (studioId && /^[a-z0-9-]+$/.test(studioId)) {
    try {
      const draft = await readStudioTheme(studioId);
      studioPending =
        Boolean(studioSourceUpdatedAt) &&
        draft.updatedAt !== studioSourceUpdatedAt;
    } catch {}
  }

  const attention: Array<{
    label: string;
    detail: string;
    href: string;
    action: string;
    tone: "blue" | "amber" | "violet";
  }> = [];

  if (newInboxCount) {
    attention.push({
      label: `${newInboxCount} new inbox message${newInboxCount === 1 ? "" : "s"}`,
      detail: "New enquiries are waiting for review.",
      href: "/admin/forms",
      action: "Open inbox",
      tone: "blue",
    });
  }

  if (pendingBookingCount) {
    attention.push({
      label: `${pendingBookingCount} pending booking${pendingBookingCount === 1 ? "" : "s"}`,
      detail: "Confirm or decline booking requests.",
      href: "/admin/forms",
      action: "Review",
      tone: "amber",
    });
  }

  if (seoAttention.length) {
    attention.push({
      label: `${seoAttention.length} page${seoAttention.length === 1 ? "" : "s"} need SEO work`,
      detail: "Titles or descriptions need attention.",
      href: "/admin/seo",
      action: "Fix SEO",
      tone: "amber",
    });
  }

  if (mediaMissingAlt) {
    attention.push({
      label: `${mediaMissingAlt} image${mediaMissingAlt === 1 ? "" : "s"} missing alt text`,
      detail: "Improve accessibility and image SEO.",
      href: "/admin/media",
      action: "Review media",
      tone: "amber",
    });
  }

  if (studioPending) {
    attention.push({
      label: `${studioName || studioId} has unpublished design changes`,
      detail: "The Theme Studio draft is newer than the applied design.",
      href: `/admin/themes/studio/${studioId}`,
      action: "Apply updates",
      tone: "violet",
    });
  }

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Overview</span>
          <h1 className="sa-h1">{site.name}</h1>
          <p className="sa-subtitle">What needs attention across content, leads, search visibility and the active design.</p>
        </div>
        <div className="sa-page-header__actions">
          <a className="sa-btn sa-btn--ghost" href="/" target="_blank" rel="noopener noreferrer">View website ↗</a>
          <a className="sa-btn sa-btn--primary" href="/admin/pages">Manage pages</a>
        </div>
      </section>

      <section className="sa-overview-attention" aria-label="Needs attention">
        <div className="sa-overview-section-head">
          <div>
            <span className="sa-card__eyebrow">Action center</span>
            <h2>Needs attention</h2>
          </div>
          <span className={`sa-overview-attention__count${attention.length === 0 ? " is-clear" : ""}`}>
            {attention.length === 0 ? "All clear" : `${attention.length} item${attention.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {attention.length ? (
          <div className="sa-overview-attention__list">
            {attention.map((item) => (
              <a className="sa-overview-attention__item" href={item.href} key={`${item.href}-${item.label}`}>
                <span className={`sa-overview-attention__dot is-${item.tone}`} />
                <span className="sa-overview-attention__copy">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="sa-overview-attention__action">{item.action}<ArrowIcon /></span>
              </a>
            ))}
          </div>
        ) : (
          <div className="sa-overview-all-clear">
            <strong>Nothing urgent right now.</strong>
            <span>Inbox, SEO, media accessibility and the applied design are all up to date.</span>
          </div>
        )}
      </section>

      <section className="sa-stats sa-stats--dashboard" aria-label="Website overview">
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Pages</span><span className="sa-stat__marker" /></div>
          <div className="sa-stat__value">{files.length}</div>
          <div className="sa-stat__desc">{indexedPages.length} indexed · {files.length - indexedPages.length} noindex</div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">SEO</span><span className="sa-stat__marker sa-stat__marker--green" /></div>
          <div className="sa-stat__value">{seoGoodCount}/{indexedPages.length}</div>
          <div className="sa-stat__desc">Indexed pages optimized</div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Media</span><span className="sa-stat__marker sa-stat__marker--violet" /></div>
          <div className="sa-stat__value">{mediaCount}</div>
          <div className="sa-stat__desc">{mediaMissingAlt} missing alt · {formatBytes(mediaBytes)}</div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Inbox</span><span className="sa-stat__marker sa-stat__marker--amber" /></div>
          <div className="sa-stat__value">{newInboxCount}</div>
          <div className="sa-stat__desc">{submissionCount} total · {pendingBookingCount} pending booking</div>
        </article>
      </section>

      <div className="sa-dashboard-grid">
        <div className="sa-overview-main">
          <section className="sa-card sa-dashboard-panel">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">Inbox</span>
              <h2>Recent enquiries</h2>
            </div>
            <a href="/admin/forms">Open inbox <ArrowIcon /></a>
          </div>

          <div className="sa-overview-inbox">
            {inbox.slice(0, 5).map((item) => {
              const name = fieldText(item.fields, "name") || fieldText(item.fields, "email") || "Unknown contact";
              const preview =
                fieldText(item.fields, "message") ||
                fieldText(item.fields, "subject") ||
                fieldText(item.fields, "booking_item") ||
                item.formId;

              return (
                <a href={`/admin/forms/${item.id}`} className="sa-overview-inbox__item" key={item.id}>
                  <span className="sa-overview-inbox__avatar">{name.slice(0, 1).toUpperCase()}</span>
                  <span className="sa-overview-inbox__copy">
                    <span className="sa-overview-inbox__line">
                      <strong>{name}</strong>
                      <small>{shortDate(item.receivedAt)}</small>
                    </span>
                    <span>{preview.length > 92 ? `${preview.slice(0, 92)}…` : preview}</span>
                    <span className="sa-overview-inbox__badges">
                      <em className={`is-${item.status}`}>{item.status}</em>
                      {item.bookingStatus ? <em className={`is-${item.bookingStatus}`}>{item.bookingStatus}</em> : null}
                    </span>
                  </span>
                  <ArrowIcon />
                </a>
              );
            })}
          </div>

          {inbox.length === 0 ? (
            <div className="sa-empty sa-empty--compact">
              <div className="sa-empty__title">Inbox is empty</div>
              <div className="sa-empty__desc">New form submissions will show here.</div>
            </div>
          ) : null}
        </section>

            <section className="sa-card sa-overview-seo">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">Search visibility</span>
              <h2>SEO attention</h2>
            </div>
            <a href="/admin/seo">Open SEO <ArrowIcon /></a>
          </div>

          {seoAttention.length ? (
            <div className="sa-overview-seo__list">
              {seoAttention.slice(0, 6).map(({ page, issues }) => (
                <a href="/admin/seo" className="sa-overview-seo__item" key={page.file}>
                  <span>
                    <strong>{page.title}</strong>
                    <small>{page.path}</small>
                  </span>
                  <span className="sa-overview-seo__issues">{issues.join(" · ")}</span>
                  <ArrowIcon />
                </a>
              ))}
            </div>
          ) : (
            <div className="sa-overview-all-clear sa-overview-all-clear--inside">
              <strong>Indexed pages look complete.</strong>
              <span>Every indexed page has a title and a useful meta description length.</span>
            </div>
          )}
        </section>

        </div>

        <aside className="sa-dashboard-side">
          <section className="sa-card sa-overview-design">
            <div className="sa-overview-design__top">
              <div>
                <span className="sa-card__eyebrow">Active design</span>
                <h2>{studioName || `${theme} / ${preset}`}</h2>
              </div>
              <span className={`sa-badge ${studioPending ? "sa-badge--muted" : "sa-badge--success"}`}>
                {studioPending ? "Updates pending" : studioId ? "Applied" : "Built-in"}
              </span>
            </div>

            <div className="sa-overview-design__preview">
              <span style={{ background: site.theme?.overrides?.colors?.primary ?? "#2563eb" }} />
              <span style={{ background: site.theme?.overrides?.colors?.surface ?? "#f1f5f9" }} />
              <span style={{ background: site.theme?.overrides?.colors?.ink ?? "#0f172a" }} />
            </div>

            <dl className="sa-overview-design__meta">
              <div><dt>Family</dt><dd>{theme}</dd></div>
              <div><dt>Preset</dt><dd>{preset}</dd></div>
              <div><dt>Status</dt><dd>{studioPending ? "Draft newer than live" : "Up to date"}</dd></div>
            </dl>

            <a className="sa-btn sa-btn--ghost" href={studioId ? `/admin/themes/studio/${studioId}` : "/admin/themes/studio"}>
              Open Theme Studio
            </a>
          </section>

          <section className="sa-card sa-shortcuts">
            <div className="sa-card__header sa-card__header--compact">
              <div>
                <span className="sa-card__eyebrow">Create</span>
                <h2>Quick create</h2>
              </div>
            </div>
            <nav className="sa-shortcut-list" aria-label="Quick actions">
              <a href="/admin/pages"><span>New page</span><small>Start from a page template</small><ArrowIcon /></a>
              <a href="/admin/media"><span>Upload media</span><small>Add images to the library</small><ArrowIcon /></a>
              <a href="/admin/themes/studio/brand"><span>Create from brand</span><small>Build a theme from a logo</small><ArrowIcon /></a>
              <a href="/admin/seo"><span>Optimize SEO</span><small>Fix titles and descriptions</small><ArrowIcon /></a>
            </nav>
          </section>
        </aside>
      </div>

      <section className="sa-overview-deployment">
        <span className={`sa-source-dot${source === "hub" ? " sa-source-dot--hub" : ""}`} />
        <strong>{source === "hub" ? "Staark Hub" : "Local fixtures"}</strong>
        <span>{mode}</span>
        <span>{process.env.STAARK_CONTENT_DIR ?? "content"}</span>
        <span>{theme}</span>
        <a href="/admin/site">Deployment & settings <ArrowIcon /></a>
      </section>
    </>
  );
}
