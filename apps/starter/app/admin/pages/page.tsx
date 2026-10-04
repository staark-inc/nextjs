"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PageEntry = {
  file: string;
  path: string;
  title: string;
  inPrimary: boolean;
  inFooter: boolean;
  navigationLabel?: string;
};

type DeletedPageEntry = PageEntry & {
  deletedAt: string;
};

type PageTemplate = {
  id: string;
  label: string;
  description: string;
  theme?: string;
};

type PageQuota = {
  resource: "pages";
  entitlementKey: "maxPages";
  current: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
};

type PagesPayload = {
  pages: PageEntry[];
  deletedPages: DeletedPageEntry[];
  theme: string;
  templates: PageTemplate[];
  quota: PageQuota | null;
};

export default function PagesIndex() {
  const router = useRouter();
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [pageQuota, setPageQuota] =
    useState<PageQuota | null>(null);
  const [deletedPages, setDeletedPages] =
    useState<DeletedPageEntry[]>([]);
  const [restoring, setRestoring] =
    useState<string | null>(null);
  const [theme, setTheme] = useState("light");
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [newPath, setNewPath] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [addToPrimary, setAddToPrimary] = useState(true);
  const [addToFooter, setAddToFooter] = useState(false);
  const [navigationLabel, setNavigationLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    const res = await fetch("/api/admin/pages");
    if (!res.ok) {
      showToast("Could not load pages.", false);
      return;
    }
    const data = await res.json() as PagesPayload;
    setPages(data.pages ?? []);
    setPageQuota(data.quota ?? null);
    setDeletedPages(data.deletedPages ?? []);
    setTheme(data.theme ?? "light");
    setTemplates(data.templates ?? []);
    if (!(data.templates ?? []).some((template) => template.id === templateId)) {
      setTemplateId("blank");
    }
  }

  useEffect(() => { void load(); }, []);

  const pagePercent =
    pageQuota?.limit &&
    pageQuota.limit > 0
      ? Math.min(
          100,
          Math.round(
            (pageQuota.current /
              pageQuota.limit) *
              100,
          ),
        )
      : null;

  const pageLimitReached =
    pageQuota?.limit !== null &&
    pageQuota?.limit !== undefined &&
    pageQuota.current >= pageQuota.limit;

  const pageNearLimit =
    pagePercent !== null &&
    pagePercent >= 80;

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templates, templateId],
  );

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const pathname = newPath.startsWith("/") ? newPath : `/${newPath}`;
    const title = newTitle || pathname.slice(1) || "New page";
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        title,
        templateId,
        addToPrimary,
        addToFooter,
        navigationLabel: navigationLabel || title,
      }),
    });
    const data = await res.json().catch(() => ({})) as { error?: string; file?: string };
    if (res.ok && data.file) {
      router.push(`/admin/pages/${data.file}`);
      return;
    }
    showToast(data.error ?? "Failed to create page.", false);
    setCreating(false);
  }

  async function deletePage(file: string, title: string) {
    if (!confirm(`Delete \"${title}\"? The page is also removed from site navigation.`)) return;
    const res = await fetch(`/api/admin/pages/${file}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Page deleted and navigation cleaned up.", true);
      await load();
    } else {
      showToast("Could not delete the page.", false);
    }
  }

  async function restorePage(
    file: string,
    title: string,
  ) {
    if (!confirm(`Restore "${title}"?`)) return;

    setRestoring(file);

    try {
      const res = await fetch(
        `/api/admin/pages/${file}/restore`,
        { method: "POST" },
      );

      const data = await res
        .json()
        .catch(() => ({})) as {
          error?: string;
        };

      if (!res.ok) {
        showToast(
          data.error ??
            "Could not restore the page.",
          false,
        );
        return;
      }

      showToast("Page restored.", true);
      await load();
    } finally {
      setRestoring(null);
    }
  }

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">Content</p>
          <h1 className="sa-h1">Pages</h1>
          <p className="sa-subtitle">Manage pages, navigation placement and templates for the active theme.</p>
        </div>
        <div className="sa-page-context">
          <span>Active theme</span>
          <strong>{theme}</strong>
        </div>
      </div>

      <div className="sa-card sa-pages-card">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">Existing pages</p>
            <h2>
              {pageQuota?.limit !== null &&
              pageQuota?.limit !== undefined
                ? `${pages.length} / ${pageQuota.limit} pages`
                : `${pages.length} pages`}
            </h2>
          </div>

          <span className="sa-note">
            {pageQuota?.remaining !== null &&
            pageQuota?.remaining !== undefined
              ? `${pageQuota.remaining} page${
                  pageQuota.remaining === 1 ? "" : "s"
                } remaining`
              : "Navigation badges reflect the active site settings."}
          </span>
        </div>
        <ul className="sa-page-list sa-page-list--managed">
          {pages.map((page) => (
            <li key={page.file}>
              <div className="sa-page-list__main">
                <Link href={`/admin/pages/${page.file}`}>{page.title}</Link>
                <div className="sa-path">{page.path}</div>
                <div className="sa-page-badges">
                  {page.inPrimary ? <span className="sa-badge sa-badge--primary">Main navigation</span> : null}
                  {page.inFooter ? <span className="sa-badge">Footer</span> : null}
                  {!page.inPrimary && !page.inFooter ? <span className="sa-badge sa-badge--muted">Not in navigation</span> : null}
                  {page.navigationLabel && page.navigationLabel !== page.title ? <span className="sa-page-nav-label">Label: {page.navigationLabel}</span> : null}
                </div>
              </div>
              <div className="sa-page-list__actions">
                <a href={page.path} target="_blank" rel="noopener noreferrer" className="sa-btn sa-btn--ghost sa-btn--sm">View</a>
                <Link href={`/admin/pages/${page.file}`} className="sa-btn sa-btn--ghost sa-btn--sm">Edit</Link>
                <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => void deletePage(page.file, page.title)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {deletedPages.length > 0 ? (
        <div className="sa-card sa-pages-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">Trash</p>
              <h2>Deleted pages</h2>
            </div>

            <span className="sa-note">
              Soft-deleted pages can be restored.
            </span>
          </div>

          <ul className="sa-page-list sa-page-list--managed">
            {deletedPages.map((page) => (
              <li key={page.file}>
                <div className="sa-page-list__main">
                  <strong>{page.title}</strong>

                  <div className="sa-path">
                    {page.path}
                  </div>

                  <div className="sa-page-badges">
                    <span className="sa-badge sa-badge--muted">
                      Deleted
                    </span>
                  </div>
                </div>

                <div className="sa-page-list__actions">
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    disabled={restoring === page.file}
                    onClick={() =>
                      void restorePage(
                        page.file,
                        page.title,
                      )
                    }
                  >
                    {restoring === page.file
                      ? "Restoring…"
                      : "Restore"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pageQuota &&
      pageQuota.limit !== null &&
      pageNearLimit ? (
        <div
          className={`sa-quota-notice ${
            pageLimitReached
              ? "sa-quota-notice--danger"
              : "sa-quota-notice--warning"
          }`}
        >
          <div>
            <strong>
              {pageLimitReached
                ? "Page limit reached"
                : "You are close to the page limit"}
            </strong>

            <span>
              {pageQuota.current} of {pageQuota.limit} pages used
              {pageQuota.remaining !== null
                ? ` · ${pageQuota.remaining} remaining`
                : ""}
              .
            </span>
          </div>

          <Link href="/admin/plan">
            View plan
          </Link>
        </div>
      ) : null}

      <div className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">Create new page</p>
          <h2>Start from a template</h2>
          <p>Theme-specific templates add the right blocks, while the page content remains independent from the theme.</p>
        </div>

        <form className="sa-create-page" onSubmit={createPage}>
          <div className="sa-form-grid sa-form-grid--2">
            <div className="sa-field">
              <label htmlFor="new-title">Title</label>
              <input id="new-title" placeholder="About us" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </div>
            <div className="sa-field">
              <label htmlFor="new-path">Path</label>
              <input id="new-path" placeholder="/about" value={newPath} onChange={(e) => setNewPath(e.target.value)} required />
            </div>
          </div>

          <div className="sa-field">
            <label htmlFor="page-template">Page template</label>
            <select id="page-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}{template.theme ? ` · ${template.theme}` : ""}</option>
              ))}
            </select>
            {selectedTemplate ? <p className="sa-field-hint">{selectedTemplate.description}</p> : null}
          </div>

          <div className="sa-navigation-options">
            <div>
              <p className="sa-card__eyebrow">Navigation</p>
              <strong>Where should this page appear?</strong>
              <p>Normal public pages can be added to the header immediately. Utility pages can stay hidden.</p>
            </div>
            <label className="sa-check-row">
              <input type="checkbox" checked={addToPrimary} onChange={(e) => setAddToPrimary(e.target.checked)} />
              <span><strong>Add to main navigation</strong><small>Show in the site header.</small></span>
            </label>
            <label className="sa-check-row">
              <input type="checkbox" checked={addToFooter} onChange={(e) => setAddToFooter(e.target.checked)} />
              <span><strong>Add to footer</strong><small>Also show in footer navigation.</small></span>
            </label>
            {(addToPrimary || addToFooter) ? (
              <div className="sa-field sa-navigation-label">
                <label htmlFor="navigation-label">Navigation label</label>
                <input id="navigation-label" placeholder={newTitle || "About us"} value={navigationLabel} onChange={(e) => setNavigationLabel(e.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="sa-form-actions">
            <button
              type="submit"
              className="sa-btn sa-btn--primary"
              disabled={
                creating ||
                pageLimitReached
              }
            >
              {creating
                ? "Creating…"
                : pageLimitReached
                  ? "Page limit reached"
                  : "Create page"}
            </button>
          </div>
        </form>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
