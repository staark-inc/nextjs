import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function contentDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
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
  const dir = contentDir();
  const site = JSON.parse(await readFile(path.join(dir, "site.json"), "utf8"));
  const files = (await readdir(path.join(dir, "pages"))).filter((file) => file.endsWith(".json"));

  let submissionCount = 0;
  try {
    const submissions = await readFile(path.join(process.cwd(), ".staark", "submissions.jsonl"), "utf8");
    submissionCount = submissions.trim().split("\n").filter(Boolean).length;
  } catch {}

  const theme = process.env.STAARK_THEME?.trim() || "salong";
  const source =
    process.env.STAARK_CONTENT_SOURCE?.trim() ||
    (process.env.STAARK_SITE_ID?.trim() && process.env.STAARK_SITE_SECRET?.trim() ? "hub" : "fixtures");
  const mode = process.env.NODE_ENV === "production" ? "Production" : "Development";
  const preset = site.theme?.preset ?? "default";

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Overview</span>
          <h1 className="sa-h1">{site.name}</h1>
          <p className="sa-subtitle">Manage the website, content and client-facing configuration from one place.</p>
        </div>
        <div className="sa-page-header__actions">
          <a className="sa-btn sa-btn--ghost" href="/" target="_blank" rel="noopener noreferrer">View website ↗</a>
          <a className="sa-btn sa-btn--primary" href="/admin/pages">Manage pages</a>
        </div>
      </section>

      <section className="sa-stats sa-stats--dashboard" aria-label="Website overview">
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Pages</span><span className="sa-stat__marker" /></div>
          <div className="sa-stat__value">{files.length}</div>
          <div className="sa-stat__desc">Published content files</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Inbox</span><span className="sa-stat__marker sa-stat__marker--green" /></div>
          <div className="sa-stat__value">{submissionCount}</div>
          <div className="sa-stat__desc">Form submissions</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Theme</span><span className="sa-stat__marker sa-stat__marker--violet" /></div>
          <div className="sa-stat__value sa-stat__value--sm">{theme}</div>
          <div className="sa-stat__desc">Active deployment theme</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__topline"><span className="sa-stat__label">Preset</span><span className="sa-stat__marker sa-stat__marker--amber" /></div>
          <div className="sa-stat__value sa-stat__value--sm">{preset}</div>
          <div className="sa-stat__desc">Visual configuration</div>
        </article>
      </section>

      <div className="sa-dashboard-grid">
        <section className="sa-card sa-dashboard-panel">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">Content</span>
              <h2>Pages</h2>
            </div>
            <a href="/admin/pages">Manage all <ArrowIcon /></a>
          </div>

          <div className="sa-dashboard-pages">
            {files.slice(0, 7).map((file) => {
              const label = file.replace(".json", "");
              const href = `/admin/pages/${file}`;
              return (
                <a href={href} className="sa-dashboard-page" key={file}>
                  <span className="sa-dashboard-page__icon">{label.slice(0, 1).toUpperCase()}</span>
                  <span className="sa-dashboard-page__copy">
                    <strong>{label}</strong>
                    <small>{file}</small>
                  </span>
                  <ArrowIcon />
                </a>
              );
            })}
          </div>

          {files.length === 0 ? (
            <div className="sa-empty sa-empty--compact">
              <div className="sa-empty__title">No pages yet</div>
              <div className="sa-empty__desc">Create the first page from the Pages section.</div>
            </div>
          ) : null}
        </section>

        <aside className="sa-dashboard-side">
          <section className="sa-deployment-card">
            <div className="sa-deployment-card__top">
              <div>
                <span className="sa-card__eyebrow">Content source</span>
                <h2>{source === "hub" ? "Staark Hub" : "Local fixtures"}</h2>
              </div>
              <span className={`sa-source-dot${source === "hub" ? " sa-source-dot--hub" : ""}`} />
            </div>
            <p>
              {source === "hub"
                ? "This deployment reads managed content from Staark Hub and refreshes through signed revalidation."
                : "This deployment reads local JSON content. Useful for development, previews and standalone editing."}
            </p>
            <dl className="sa-deployment-meta">
              <div><dt>Mode</dt><dd>{mode}</dd></div>
              <div><dt>Directory</dt><dd>{process.env.STAARK_CONTENT_DIR ?? "content"}</dd></div>
              <div><dt>Theme</dt><dd>{theme}</dd></div>
            </dl>
          </section>

          <section className="sa-card sa-shortcuts">
            <div className="sa-card__header sa-card__header--compact">
              <div>
                <span className="sa-card__eyebrow">Shortcuts</span>
                <h2>Quick actions</h2>
              </div>
            </div>
            <nav className="sa-shortcut-list" aria-label="Quick actions">
              <a href="/admin/forms"><span>Inbox</span><small>Review form submissions</small><ArrowIcon /></a>
              <a href="/admin/media"><span>Media</span><small>Upload images and assets</small><ArrowIcon /></a>
              <a href="/admin/seo"><span>SEO</span><small>Titles and search previews</small><ArrowIcon /></a>
              <a href="/admin/site"><span>Settings</span><small>Business and site details</small><ArrowIcon /></a>
            </nav>
          </section>
        </aside>
      </div>
    </>
  );
}
