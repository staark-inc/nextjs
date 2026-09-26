"use client";

import { useEffect, useState } from "react";

type PageSeo = {
  file: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  hasOg: boolean;
};

type SiteSeo = {
  titleTemplate: string;
  defaultDescription: string;
  businessType: string;
};

export default function SeoPage() {
  const [pages, setPages] = useState<PageSeo[]>([]);
  const [siteSeo, setSiteSeo] = useState<SiteSeo>({ titleTemplate: "", defaultDescription: "", businessType: "" });
  const [siteData, setSiteData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      businessType: site.seo?.businessType ?? "",
    });

    const pagesData = await pagesRes.json();
    setPages(pagesData.pages ?? []);
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

  function seoScore(p: PageSeo): { label: string; cls: string } {
    let score = 0;
    if (p.seoTitle) score++;
    if (p.seoDescription) score++;
    if (p.seoDescription && p.seoDescription.length >= 50 && p.seoDescription.length <= 160) score++;
    if (score === 3) return { label: "Good", cls: "sa-status--read" };
    if (score >= 1) return { label: "Needs work", cls: "sa-status--pending" };
    return { label: "Missing", cls: "sa-status--declined" };
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  const goodCount = pages.filter((p) => seoScore(p).label === "Good").length;
  const needsWork = pages.filter((p) => seoScore(p).label !== "Good").length;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>SEO</span>
      </div>

      <h1 className="sa-h1">SEO</h1>
      <p className="sa-subtitle">Search engine optimization settings and page audit.</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Pages</div>
          <div className="sa-stat__value">{pages.length}</div>
          <div className="sa-stat__desc">Total pages</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Optimized</div>
          <div className="sa-stat__value">{goodCount}</div>
          <div className="sa-stat__desc">SEO complete</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Needs work</div>
          <div className="sa-stat__value">{needsWork}</div>
          <div className="sa-stat__desc">Missing fields</div>
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
        <p className="sa-subtitle" style={{ marginBottom: 16 }}>Click a page to edit its SEO fields.</p>
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
              {pages.map((p) => {
                const score = seoScore(p);
                return (
                  <tr key={p.file}>
                    <td>
                      <a href={`/admin/pages/${p.file}`} style={{ fontWeight: 600, color: "var(--sa-primary)", textDecoration: "none" }}>
                        {p.title || p.path}
                      </a>
                      <div style={{ color: "var(--sa-muted)", fontSize: 12 }}>{p.path}</div>
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

      {toast && <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div>}
    </>
  );
}
