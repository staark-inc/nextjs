"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { hasFieldForm } from "./BlockFieldFormMeta";

const BlockFieldForm = dynamic(
  () =>
    import("./BlockFieldForm").then(
      (module) => module.BlockFieldForm,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="sa-loading">
        Loading block editor…
      </div>
    ),
  },
);
import { validateBlocks, type FieldError } from "@/lib/block-fields";

type Block = { id: string; type: string; props: Record<string, unknown> };
type SeoData = { title?: string; description?: string; ogImage?: string; canonical?: string };
export type PageData = { path: string; title: string; seo: SeoData; blocks: Block[]; updatedAt?: string };
type BlockTemplate = { type: string; label: string; description: string; icon: string; template: Record<string, unknown> };

export default function PageEditorClient({
  file,
  initialPage,
}: {
  file: string;
  initialPage: PageData;
}) {
  const [page, setPage] = useState<PageData | null>(initialPage);
  const [json, setJson] = useState(() => JSON.stringify(initialPage, null, 2));
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [mode, setMode] = useState<"visual" | "seo" | "json">("visual");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [blockErrors, setBlockErrors] = useState<Record<string, FieldError[]>>({});
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [activeTheme, setActiveTheme] = useState("light");
  const [activeThemeName, setActiveThemeName] = useState("Light");
  const [commonBlockIds, setCommonBlockIds] = useState<string[]>([]);
  const [themeOwnedBlockIds, setThemeOwnedBlockIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [jsonBlocks, setJsonBlocks] = useState<Set<string>>(new Set());
  const [advancedEditing, setAdvancedEditing] = useState(false);

  function toggleJsonBlock(id: string) {
    setJsonBlocks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setBlockProps(blockId: string, props: Record<string, unknown>) {
    setPage((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, props } : b)) };
      setJson(JSON.stringify(updated, null, 2));
      return updated;
    });
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setPage(initialPage);
    setJson(JSON.stringify(initialPage, null, 2));
  }, [initialPage]);

  useEffect(() => {
    fetch("/api/admin/blocks")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.blocks ?? []);
        setActiveTheme(data.theme ?? "light");
        setActiveThemeName(data.themeName ?? data.theme ?? "Light");
        setCommonBlockIds(data.commonBlockIds ?? []);
        setThemeOwnedBlockIds(data.themeOwnedBlockIds ?? []);
        setAdvancedEditing(data.advancedEditing === true);
      });
  }, [file]);

  function updatePage(updated: PageData) {
    setPage(updated);
    setJson(JSON.stringify(updated, null, 2));
  }

  function updateField(field: keyof PageData, value: string) {
    if (!page) return;
    updatePage({ ...page, [field]: value });
  }

  function updateSeo(field: keyof SeoData, value: string) {
    if (!page) return;
    updatePage({ ...page, seo: { ...page.seo, [field]: value } });
  }

  function updateBlockProps(blockId: string, propsJson: string) {
    if (!page) return;
    try {
      const props = JSON.parse(propsJson);
      updatePage({ ...page, blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, props } : b)) });
    } catch {}
  }

  function syncFromJson() {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.seo) parsed.seo = {};
      setPage(parsed);
      showToast("Synced from JSON.", true);
    } catch {
      showToast("Invalid JSON.", false);
    }
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    if (!page) return;
    const blocks = [...page.blocks];
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target]!, blocks[idx]!];
    updatePage({ ...page, blocks });
  }

  function removeBlock(idx: number) {
    if (!page) return;
    updatePage({ ...page, blocks: page.blocks.filter((_, i) => i !== idx) });
  }

  function addBlock(tmpl: BlockTemplate) {
    if (!page) return;
    const id = `${tmpl.type}-${Date.now()}`;
    const block: Block = { id, type: tmpl.type, props: structuredClone(tmpl.template) };
    updatePage({ ...page, blocks: [...page.blocks, block] });
    setOpenBlock(id);
    setShowPicker(false);
  }

  async function save() {
    let body: unknown;
    if (mode === "json" && advancedEditing) {
      try { body = JSON.parse(json); } catch {
        showToast("Invalid JSON — check the syntax.", false);
        return;
      }
    } else {
      body = page;
    }

    // Validate required fields before saving; show errors inline instead of a generic failure.
    const bodyBlocks = (body as { blocks?: { id: string; type: string; props: Record<string, unknown> }[] }).blocks ?? [];
    const errors = validateBlocks(bodyBlocks, activeTheme);
    setBlockErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.keys(errors)[0]!;
      setMode("visual");
      setOpenBlock(first);
      const count = Object.values(errors).reduce((n, e) => n + e.length, 0);
      showToast(`Fix ${count} required field${count === 1 ? "" : "s"} before saving.`, false);
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/pages/${file}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Page saved!", true);
      return;
    }
    // Server-side validation (defense in depth) returns field errors too.
    const data: { fieldErrors?: Record<string, FieldError[]>; error?: string } = await res.json().catch(() => ({}));
    if (data.fieldErrors) {
      setBlockErrors(data.fieldErrors);
      setMode("visual");
      setOpenBlock(Object.keys(data.fieldErrors)[0] ?? null);
    }
    showToast(data.error ?? "Failed to save.", false);
  }

  if (!page) {
    return (
      <>
        <section className="sa-page-header">
          <div>
            <span className="sa-page-eyebrow">Content</span>
            <h1 className="sa-h1">Loading page…</h1>
            <p className="sa-subtitle">
              Preparing the page editor.
            </p>
          </div>
        </section>

        <div className="sa-card">
          <div className="sa-loading">
            Loading content and editor…
          </div>
        </div>
      </>
    );
  }

  const commonIds = new Set(commonBlockIds);
  const ownedIds = new Set(themeOwnedBlockIds);

  const commonTemplates = templates.filter((t) =>
    commonIds.size ? commonIds.has(t.type) : !ownedIds.has(t.type),
  );

  const themeTemplates = templates.filter(
    (t) => ownedIds.has(t.type) && !commonIds.has(t.type),
  );

  const themeShortName =
    activeThemeName.replace(/^S-Hub\s+/i, "").trim() ||
    activeTheme;

  const themeIcon =
    ({
      el: "⚡",
      kreator: "🎥",
      skonhet: "✨",
      salong: "✂️",
      gastfrihet: "🛏️",
      byra: "◆",
      webb: "💻",
    } as Record<string, string>)[activeTheme] ?? "◆";

  const isThemeOverride = (type: string) =>
    activeTheme !== "light" &&
    commonIds.has(type) &&
    ownedIds.has(type);

  const seoTitleLen = (page.seo.title ?? "").length;
  const seoDescLen = (page.seo.description ?? "").length;

  return (
    <>
      <div className="sa-breadcrumb">
        <Link href="/admin">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/pages">Pages</Link>
        <span>/</span>
        <span>{page.title}</span>
      </div>

      <h1 className="sa-h1">{page.title}</h1>
      <p className="sa-subtitle">{page.path}</p>

      <div className="sa-toolbar">
        <div className="sa-tab-bar">
          <button className={`sa-tab${mode === "visual" ? " sa-tab--active" : ""}`} onClick={() => setMode("visual")}>Content</button>
          <button className={`sa-tab${mode === "seo" ? " sa-tab--active" : ""}`} onClick={() => setMode("seo")}>SEO</button>
          {advancedEditing ? (
            <button className={`sa-tab${mode === "json" ? " sa-tab--active" : ""}`} onClick={() => setMode("json")}>JSON</button>
          ) : null}
        </div>
        <span className="sa-toolbar--right" />
        <Link href={`/admin/pages/${file}/revisions`} className="sa-btn sa-btn--ghost sa-btn--sm">History</Link>
        <a href={page.path} target="_blank" rel="noopener" className="sa-btn sa-btn--ghost sa-btn--sm">Preview &rarr;</a>
        <button className="sa-btn sa-btn--primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {mode === "visual" && (
        <>
          <div className="sa-card">
            <h3>Page info</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="sa-field">
                <label htmlFor="page-title">Title</label>
                <input id="page-title" value={page.title} onChange={(e) => updateField("title", e.target.value)} />
              </div>
              <div className="sa-field">
                <label htmlFor="page-path">Path</label>
                <input id="page-path" value={page.path} onChange={(e) => updateField("path", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="sa-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Blocks <span className="sa-badge sa-badge--primary" style={{ marginLeft: 8 }}>{page.blocks.length}</span></h3>
              <button className="sa-btn sa-btn--primary sa-btn--sm" onClick={() => setShowPicker(true)}>+ Add block</button>
            </div>

            {showPicker && (
              <div className="sa-block-picker">
                <div className="sa-block-picker__header">
                  <strong>Choose a block type</strong>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => setShowPicker(false)}>&times;</button>
                </div>
                <div className="sa-block-picker__groups">
                  <section className="sa-block-picker__group">
                    <div className="sa-block-picker__group-title">
                      <span>Common blocks</span>
                      <small>Light foundation</small>
                    </div>

                    <div className="sa-block-picker__grid">
                      {commonTemplates.map((t) => (
                        <button key={t.type} className="sa-block-picker__item" onClick={() => addBlock(t)}>
                          <div className="sa-block-picker__icon">{iconForType(t.icon)}</div>
                          <div className="sa-block-picker__label-row">
                            <div className="sa-block-picker__label">{t.label}</div>
                            {isThemeOverride(t.type) ? (
                              <span className="sa-block-picker__override">
                                {themeIcon} {themeShortName}
                              </span>
                            ) : null}
                          </div>
                          <div className="sa-block-picker__desc">{t.description}</div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {themeTemplates.length > 0 ? (
                    <section className="sa-block-picker__group">
                      <div className="sa-block-picker__group-title sa-block-picker__group-title--theme">
                        <span>{themeIcon} {themeShortName} blocks</span>
                        <small>Theme specific</small>
                      </div>

                      <div className="sa-block-picker__grid">
                        {themeTemplates.map((t) => (
                          <button key={t.type} className="sa-block-picker__item sa-block-picker__item--theme" onClick={() => addBlock(t)}>
                            <div className="sa-block-picker__icon">{iconForType(t.icon)}</div>
                            <div className="sa-block-picker__label">{t.label}</div>
                            <div className="sa-block-picker__desc">{t.description}</div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            )}

            <ul className="sa-blocks">
              {page.blocks.map((block, idx) => (
                <li key={block.id} className="sa-block">
                  <div className="sa-block__header" onClick={() => setOpenBlock(openBlock === block.id ? null : block.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="sa-block__num">{idx + 1}</span>
                      <span className="sa-block__id">{block.id}</span>
                      <span className="sa-block__type">{block.type}</span>
                      {blockErrors[block.id]?.length ? <span className="sa-badge sa-badge--danger">{blockErrors[block.id]!.length} ⚠</span> : null}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }} disabled={idx === 0}>&uarr;</button>
                      <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }} disabled={idx === page.blocks.length - 1}>&darr;</button>
                      <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}>&#x2715;</button>
                    </div>
                  </div>
                  {openBlock === block.id && (
                    <div className="sa-block__body">
                      {advancedEditing ? (
                        <div className="sa-field">
                          <label>Type</label>
                          <select
                            value={block.type}
                            onChange={(e) => {
                              const blocks = page.blocks.map((b) => (b.id === block.id ? { ...b, type: e.target.value } : b));
                              updatePage({ ...page, blocks });
                            }}
                          >
                            {templates.map((t) => <option key={t.type} value={t.type}>{t.label} — {t.type}</option>)}
                            {!templates.find((t) => t.type === block.type) && (
                              <option value={block.type}>{block.type}</option>
                            )}
                          </select>
                        </div>
                      ) : null}
                      {hasFieldForm(block.type, activeTheme) &&
                      (!advancedEditing || !jsonBlocks.has(block.id)) ? (
                        <>
                          <BlockFieldForm
                            type={block.type}
                            themeId={activeTheme}
                            value={block.props}
                            errors={blockErrors[block.id]}
                            onChange={(props) => setBlockProps(block.id, props)}
                          />

                          {advancedEditing ? (
                            <button
                              type="button"
                              className="sa-btn sa-btn--ghost sa-btn--sm"
                              style={{ marginTop: 12 }}
                              onClick={() => toggleJsonBlock(block.id)}
                            >
                              Advanced (JSON)
                            </button>
                          ) : null}
                        </>
                      ) : advancedEditing ? (
                        <div className="sa-field">
                          <label>Props (JSON)</label>
                          <textarea
                            key={`${block.id}-${jsonBlocks.has(block.id)}`}
                            className="sa-json-editor"
                            defaultValue={JSON.stringify(block.props, null, 2)}
                            onBlur={(e) => updateBlockProps(block.id, e.target.value)}
                            rows={14}
                            spellCheck={false}
                          />

                          {hasFieldForm(block.type, activeTheme) ? (
                            <button
                              type="button"
                              className="sa-btn sa-btn--ghost sa-btn--sm"
                              style={{ marginTop: 8 }}
                              onClick={() => toggleJsonBlock(block.id)}
                            >
                              &larr; Back to form
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="sa-field">
                          <div className="sa-field-hint">
                            This block uses advanced settings that can only be
                            edited by the site manager.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {mode === "seo" && (
        <>
          <div className="sa-card">
            <h3>Meta tags</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <div className="sa-field">
                <label htmlFor="seo-title">SEO title</label>
                <input
                  id="seo-title"
                  value={page.seo.title ?? ""}
                  onChange={(e) => updateSeo("title", e.target.value)}
                  placeholder={page.title}
                />
                <div className="sa-field-hint" style={{ color: seoTitleLen > 60 ? "var(--sa-danger)" : undefined }}>
                  {seoTitleLen}/60 characters {seoTitleLen > 60 ? " — too long" : ""}
                </div>
              </div>
              <div className="sa-field">
                <label htmlFor="seo-desc">Meta description</label>
                <textarea
                  id="seo-desc"
                  value={page.seo.description ?? ""}
                  onChange={(e) => updateSeo("description", e.target.value)}
                  placeholder="Describe this page for search engines..."
                  rows={3}
                />
                <div className="sa-field-hint" style={{ color: seoDescLen > 160 ? "var(--sa-danger)" : seoDescLen >= 50 ? "var(--sa-success)" : undefined }}>
                  {seoDescLen}/160 characters {seoDescLen > 0 && seoDescLen < 50 ? " — too short" : ""}
                </div>
              </div>
              <div className="sa-field">
                <label htmlFor="seo-og">OG image URL</label>
                <input
                  id="seo-og"
                  value={page.seo.ogImage ?? ""}
                  onChange={(e) => updateSeo("ogImage", e.target.value)}
                  placeholder="/uploads/og-image.jpg"
                />
                <div className="sa-field-hint">Social sharing image. Recommended: 1200x630px</div>
              </div>
              <div className="sa-field">
                <label htmlFor="seo-canonical">Canonical URL</label>
                <input
                  id="seo-canonical"
                  value={page.seo.canonical ?? ""}
                  onChange={(e) => updateSeo("canonical", e.target.value)}
                  placeholder="Leave empty to use default"
                />
                <div className="sa-field-hint">Set only if this page has a preferred URL.</div>
              </div>
            </div>
          </div>

          <div className="sa-card">
            <h3>Google preview</h3>
            <div className="sa-seo-preview">
              <div className="sa-seo-preview__title">
                {page.seo.title || page.title || "Untitled page"}
              </div>
              <div className="sa-seo-preview__url">
                example.com{page.path}
              </div>
              <div className="sa-seo-preview__desc">
                {page.seo.description || "No description set. Add a meta description to improve search visibility."}
              </div>
            </div>
          </div>
        </>
      )}

      {advancedEditing && mode === "json" && (
        <div className="sa-card">
          <div className="sa-field">
            <label htmlFor="page-json">Full page JSON</label>
            <textarea
              id="page-json"
              className="sa-json-editor"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={30}
              spellCheck={false}
            />
          </div>
          <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={syncFromJson} style={{ marginTop: 8 }}>
            Sync to visual view
          </button>
        </div>
      )}

      {toast && <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div>}
    </>
  );
}

function iconForType(icon: string): string {
  const map: Record<string, string> = {
    layout: "🏠", grid: "📦", "list-ordered": "📋", "message-circle": "💬",
    megaphone: "📣", mail: "✉️", receipt: "🧾", image: "🖼️",
    bed: "🛏️", sparkles: "✨", "pen-tool": "✎",
  };
  return map[icon] ?? "📄";
}
