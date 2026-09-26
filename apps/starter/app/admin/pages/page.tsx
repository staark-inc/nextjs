"use client";

import { useEffect, useState } from "react";

type PageEntry = { file: string; path: string; title: string };

export default function PagesIndex() {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [newPath, setNewPath] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    const res = await fetch("/api/admin/pages");
    setPages(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    const p = newPath.startsWith("/") ? newPath : `/${newPath}`;
    const body = {
      path: p,
      title: newTitle || p.slice(1) || "New page",
      seo: {},
      blocks: [],
      updatedAt: new Date().toISOString(),
    };
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setNewPath("");
      setNewTitle("");
      showToast("Page created!", true);
      load();
    } else {
      showToast("Failed to create page.", false);
    }
  }

  async function deletePage(file: string) {
    if (!confirm(`Delete ${file}?`)) return;
    const res = await fetch(`/api/admin/pages/${file}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Page deleted.", true);
      load();
    }
  }

  return (
    <>
      <h1 className="sa-h1">Pages</h1>
      <p className="sa-subtitle">Manage fixture pages in the content directory.</p>

      <div className="sa-card">
        <h3>Existing pages</h3>
        <ul className="sa-page-list">
          {pages.map((p) => (
            <li key={p.file}>
              <div>
                <a href={`/admin/pages/${p.file}`}>{p.title}</a>
                <div className="sa-path">{p.path}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a href={`/admin/pages/${p.file}`} className="sa-btn sa-btn--ghost sa-btn--sm">Edit</a>
                <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => deletePage(p.file)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="sa-card">
        <h3>Create new page</h3>
        <form className="sa-inline-form" onSubmit={createPage}>
          <div className="sa-field">
            <label htmlFor="new-path">Path</label>
            <input id="new-path" placeholder="/about" value={newPath} onChange={(e) => setNewPath(e.target.value)} required />
          </div>
          <div className="sa-field">
            <label htmlFor="new-title">Title</label>
            <input id="new-title" placeholder="About us" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <button type="submit" className="sa-btn sa-btn--primary" style={{ marginBottom: 0 }}>Create</button>
        </form>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
