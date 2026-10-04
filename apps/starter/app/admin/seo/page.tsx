"use client";

import { useEffect, useState } from "react";

type SeoAuditCheck = {
  key: string;
  label: string;
  passed: boolean;
  tone: "good" | "warning" | "error" | "info";
  message: string;
  points: number;
  maxPoints: number;
};

type PageSeo = {
  file: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  noindex: boolean;
  updatedAt?: string;
  hasOg: boolean;
  published?: boolean;

  audit: {
    score: number;
    status:
      | "good"
      | "needs-work"
      | "poor"
      | "noindex";
    checks: SeoAuditCheck[];
    internalLinks: number;
    images: number;
    imagesWithAlt: number;
  };
};

type SiteSeo = {
  titleTemplate: string;
  defaultDescription: string;
  ogImage: string;
  businessType: string;
};

type SeoDraft = {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
};

export default function SeoPage() {
  const [pages, setPages] = useState<PageSeo[]>([]);
  const [siteSeo, setSiteSeo] = useState<SiteSeo>({ titleTemplate: "", defaultDescription: "", ogImage: "", businessType: "" });
  const [siteData, setSiteData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<SeoDraft | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);

    const [siteRes, pagesRes] = await Promise.all([
      fetch("/api/admin/site"),
      fetch("/api/admin/seo/pages"),
    ]);

    const site = await siteRes.json();
    setSiteData(site);
    setSiteSeo({
      titleTemplate: site.seo?.titleTemplate ?? "",
      defaultDescription: site.seo?.defaultDescription ?? "",
      ogImage: site.seo?.ogImage ?? "",
      businessType: site.seo?.businessType ?? "",
    });

    const pagesData = await pagesRes.json();
    const loadedPages = (pagesData.pages ?? []) as PageSeo[];
    setPages(loadedPages);
    if (!selected && loadedPages[0]) {
      const first = loadedPages[0];
      setSelected(first.file);
      setDraft({
        title: first.seoTitle,
        description: first.seoDescription,
        ogImage: first.ogImage,
        noindex: first.noindex,
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveSiteSeo() {
    if (!siteData) return;
    setSaving(true);
    const updated = { ...siteData, seo: { ...((siteData.seo as object) ?? {}), ...siteSeo } };
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setSaving(false);
    showToast(res.ok ? "SEO settings saved!" : "Failed to save.", res.ok);
    if (res.ok) setSiteData(updated);
  }

  function selectPage(page: PageSeo) {
    setSelected(page.file);
    setDraft({
      title: page.seoTitle,
      description: page.seoDescription,
      ogImage: page.ogImage,
      noindex: page.noindex,
    });
    window.setTimeout(() => document.getElementById("seo-page-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  async function savePageSeo() {
    if (!selected || !draft) return;
    setSavingPage(true);
    const res = await fetch("/api/admin/seo/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: selected, ...draft }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingPage(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Failed to save page SEO.", false);
      return;
    }

    const saved = (data as { page: PageSeo }).page;
    setPages((current) => current.map((page) => page.file === saved.file ? saved : page));
    setDraft({ title: saved.seoTitle, description: saved.seoDescription, ogImage: saved.ogImage, noindex: saved.noindex });
    showToast("Page SEO saved.", true);
  }

  function seoScore(
    p: PageSeo,
  ): {
    label: string;
    cls: string;
  } {
    if (p.audit.status === "noindex") {
      return {
        label: "Noindex",
        cls: "sa-status--pending",
      };
    }

    if (p.audit.status === "good") {
      return {
        label: `${p.audit.score} · Good`,
        cls: "sa-status--read",
      };
    }

    if (
      p.audit.status ===
      "needs-work"
    ) {
      return {
        label: `${p.audit.score} · Needs work`,
        cls: "sa-status--pending",
      };
    }

    return {
      label: `${p.audit.score} · Poor`,
      cls: "sa-status--declined",
    };
  }

  function matchesFilter(page: PageSeo): boolean {
    const status = seoScore(page).label;
    if (filter === "good") return status === "Good";
    if (filter === "needs") return status === "Needs work";
    if (filter === "missing") return page.audit.status === "poor";
    if (filter === "noindex") return page.noindex;
    return true;
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  const goodCount = pages.filter((p) => !p.noindex && seoScore(p).label === "Good").length;
  const needsWork = pages.filter((p) => !p.noindex && seoScore(p).label !== "Good").length;
  const noindexCount = pages.filter((p) => p.noindex).length;
  const selectedPage = pages.find((page) => page.file === selected) ?? null;
  const filteredPages = pages.filter((page) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || `${page.title} ${page.path} ${page.seoTitle}`.toLowerCase().includes(needle);
    return matchesQuery && matchesFilter(page);
  });

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Growth</span>
          <h1 className="sa-h1">SEO</h1>
          <p className="sa-subtitle">Search engine optimization settings and page audit.</p>
        </div>
      </section>

      <div className="sa-stats sa-stats--dashboard">
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Pages</div>
          <div className="sa-stat__value">{pages.length}</div>
          <div className="sa-stat__desc">Total pages</div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Optimized</div>
          <div className="sa-stat__value">{goodCount}</div>
          <div className="sa-stat__desc">SEO complete</div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Needs work</div>
          <div className="sa-stat__value">{needsWork}</div>
          <div className="sa-stat__desc">Missing fields</div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Noindex</div>
          <div className="sa-stat__value">{noindexCount}</div>
          <div className="sa-stat__desc">Excluded from search</div>
        </div>
      </div>

      <div className="sa-card">
        <h3>Site-wide SEO</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="sa-field">
            <label htmlFor="seo-template">Title template</label>
            <input
              id="seo-template"
              value={siteSeo.titleTemplate}
              onChange={(e) => setSiteSeo({ ...siteSeo, titleTemplate: e.target.value })}
              placeholder="%s | My Site"
            />
            <div className="sa-field-hint">Use %s for the page title. Example: &quot;%s | Staark Demo&quot;</div>
          </div>
          <div className="sa-field">
            <label htmlFor="seo-desc">Default description</label>
            <textarea
              id="seo-desc"
              value={siteSeo.defaultDescription}
              onChange={(e) => setSiteSeo({ ...siteSeo, defaultDescription: e.target.value })}
              rows={3}
              placeholder="Default meta description for pages without one."
            />
            <div className="sa-field-hint">{siteSeo.defaultDescription.length}/160 characters</div>
          </div>
          <div className="sa-field">
            <label htmlFor="seo-og">Default Open Graph image</label>
            <input
              id="seo-og"
              value={siteSeo.ogImage}
              onChange={(e) => setSiteSeo({ ...siteSeo, ogImage: e.target.value })}
              placeholder="/uploads/social-cover.jpg"
            />
            <div className="sa-field-hint">Used when a page has no custom social image.</div>
          </div>
          <div className="sa-field">
            <label htmlFor="seo-type">Business type (Schema.org)</label>
            <select
              id="seo-type"
              value={siteSeo.businessType}
              onChange={(e) => setSiteSeo({ ...siteSeo, businessType: e.target.value })}
            >
              <option value="">Select...</option>
              <option value="ProfessionalService">Professional Service</option>
              <option value="LocalBusiness">Local Business</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Store">Store</option>
              <option value="LodgingBusiness">Lodging / Hotel</option>
              <option value="HealthAndBeautyBusiness">Health &amp; Beauty</option>
              <option value="AutomotiveBusiness">Automotive</option>
            </select>
          </div>
          <div>
            <button className="sa-btn sa-btn--primary" onClick={saveSiteSeo} disabled={saving}>
              {saving ? "Saving..." : "Save SEO settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="sa-card">
        <h3>Page audit</h3>
        <p className="sa-subtitle" style={{ marginBottom: 16 }}>Search, audit and edit page SEO without leaving this screen.</p>
        <div className="sa-seo-toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages…"
            aria-label="Search pages"
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter SEO status">
            <option value="all">All pages</option>
            <option value="good">Good</option>
            <option value="needs">Needs work</option>
                    <option value="missing">Poor</option>
            <option value="noindex">Noindex</option>
          </select>
          <span>{filteredPages.length} result(s)</span>
        </div>
        <div style={{ padding: 0, overflow: "auto" }}>
          <table className="sa-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>SEO title</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((p) => {
                const score = seoScore(p);
                return (
                  <tr key={p.file} className={selected === p.file ? "sa-seo-row--selected" : ""}>
                    <td>
                      <button className="sa-seo-page-link" onClick={() => selectPage(p)}>
                        {p.title || p.path}
                      </button>
                      <div style={{ color: "var(--sa-muted)", fontSize: 12 }}>{p.path}{p.noindex ? " · noindex" : ""}</div>
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 200 }}>
                      {p.seoTitle || <span style={{ color: "var(--sa-muted)" }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 300 }}>
                      {p.seoDescription
                        ? `${p.seoDescription.slice(0, 80)}${p.seoDescription.length > 80 ? "..." : ""}`
                        : <span style={{ color: "var(--sa-muted)" }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`sa-status ${score.cls}`}>
                        <span className="sa-status__dot" />
                        {score.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPage && draft ? (
        <div className="sa-seo-editor-grid" id="seo-page-editor">
          <section className="sa-card sa-seo-editor">
            <div className="sa-seo-editor__head">
              <div>
                <span className="sa-page-eyebrow">Page SEO</span>
                <h3>{selectedPage.title}</h3>
                <p>{selectedPage.path}</p>
              </div>
              <a className="sa-btn sa-btn--ghost sa-btn--sm" href={`/admin/pages/${selectedPage.file}`}>Edit page</a>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                padding: 16,
                marginBottom: 20,
                border: "1px solid var(--sa-border)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <span className="sa-page-eyebrow">
                    Live SEO audit
                  </span>

                  <h3 style={{ margin: "4px 0 0" }}>
                    Score {selectedPage.audit.score}/100
                  </h3>
                </div>

                <span
                  className={`sa-status ${
                    seoScore(selectedPage).cls
                  }`}
                >
                  <span className="sa-status__dot" />
                  {seoScore(selectedPage).label}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {selectedPage.audit.checks.map(
                  (check) => (
                    <div
                      key={check.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "24px minmax(0,1fr)",
                        gap: 8,
                        alignItems: "start",
                      }}
                    >
                      <span>
                        {check.passed
                          ? "✓"
                          : check.tone === "error"
                            ? "✕"
                            : "!"}
                      </span>

                      <div>
                        <strong>
                          {check.label}
                        </strong>

                        <div className="sa-field-hint">
                          {check.message}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <small className="sa-note">
                Audit reflects the currently published version.
                SEO edits are saved as draft until the page is published.
              </small>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-title">SEO title</label>
              <input
                id="page-seo-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder={selectedPage.title}
              />
              <div className={`sa-field-hint${draft.title.length > 65 ? " is-warning" : ""}`}>{draft.title.length}/65 characters</div>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-description">Meta description</label>
              <textarea
                id="page-seo-description"
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder={siteSeo.defaultDescription || "Describe this page for search results."}
              />
              <div className={`sa-field-hint${draft.description.length > 160 ? " is-warning" : ""}`}>{draft.description.length}/160 characters</div>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-og">Open Graph image</label>
              <input
                id="page-seo-og"
                value={draft.ogImage}
                onChange={(event) => setDraft({ ...draft, ogImage: event.target.value })}
                placeholder={siteSeo.ogImage || "/uploads/social-cover.jpg"}
              />
              <div className="sa-field-hint"><a href="/admin/media">Open Media</a> to copy an image URL.</div>
            </div>

            <label className="sa-seo-index-toggle">
              <input
                type="checkbox"
                checked={draft.noindex}
                onChange={(event) => setDraft({ ...draft, noindex: event.target.checked })}
              />
              <span>
                <strong>Hide from search engines</strong>
                <small>Adds noindex and removes this page from the generated sitemap.</small>
              </span>
            </label>

            <button className="sa-btn sa-btn--primary" onClick={() => void savePageSeo()} disabled={savingPage}>
              {savingPage ? "Saving…" : "Save page SEO"}
            </button>
          </section>

          <aside className="sa-card sa-seo-live-preview">
            <span className="sa-page-eyebrow">Live preview</span>
            <h3>Google result</h3>
            <div className="sa-seo-preview">
              <div className="sa-seo-preview__title">{draft.title || selectedPage.title}</div>
              <div className="sa-seo-preview__url">{siteData && typeof siteData.url === "string" ? `${siteData.url}${selectedPage.path === "/" ? "" : selectedPage.path}` : `https://example.com${selectedPage.path}`}</div>
              <div className="sa-seo-preview__desc">{draft.description || siteSeo.defaultDescription || "No description set."}</div>
            </div>
            <div className="sa-seo-social-preview">
              <div className="sa-seo-social-preview__image">
                {(draft.ogImage || siteSeo.ogImage) ? <img src={draft.ogImage || siteSeo.ogImage} alt="" /> : <span>No social image</span>}
              </div>
              <strong>{draft.title || selectedPage.title}</strong>
              <p>{draft.description || siteSeo.defaultDescription || "Add a description for social sharing."}</p>
            </div>
          </aside>
        </div>
      ) : null}

      {!selectedPage ? (
        <div className="sa-card">
          <h3>Google preview</h3>
          <p className="sa-subtitle" style={{ marginBottom: 8 }}>How your homepage may appear in search results.</p>
          <div className="sa-seo-preview">
            <div className="sa-seo-preview__title">
              {siteSeo.titleTemplate
                ? siteSeo.titleTemplate.replace("%s", pages[0]?.seoTitle || pages[0]?.title || "Home")
                : pages[0]?.seoTitle || pages[0]?.title || "Home"}
            </div>
            <div className="sa-seo-preview__url">
              {siteData && typeof (siteData as Record<string, unknown>).url === "string"
                ? String((siteData as Record<string, unknown>).url)
                : "https://example.com"}
            </div>
            <div className="sa-seo-preview__desc">
              {pages[0]?.seoDescription || siteSeo.defaultDescription || "No description set."}
            </div>
          </div>
        </div>
      ) : null}

      {toast && <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div>}
    </>
  );
}
