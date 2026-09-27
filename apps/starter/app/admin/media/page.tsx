"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./media.module.css";

type MediaUsage = {
  source: string;
  label: string;
  field: string;
  href?: string;
};

type MediaFile = {
  name: string;
  url: string;
  size: number;
  modifiedAt: string;
  alt: string;
  usage: MediaUsage[];
  usageCount: number;
};

type Toast = { msg: string; ok: boolean } | null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [altDraft, setAltDraft] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const selected = files.find((file) => file.name === selectedName) ?? null;
  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return files;
    return files.filter((file) => file.name.toLowerCase().includes(normalized) || file.alt.toLowerCase().includes(normalized));
  }, [files, query]);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function load(preferredName?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load media.");
      const nextFiles = (data.files ?? []) as MediaFile[];
      setFiles(nextFiles);
      const nextSelected = preferredName ?? selectedName;
      if (nextSelected && nextFiles.some((file) => file.name === nextSelected)) {
        setSelectedName(nextSelected);
      } else if (selectedName && !nextFiles.some((file) => file.name === selectedName)) {
        setSelectedName(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load media.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { setAltDraft(selected?.alt ?? ""); }, [selected?.name, selected?.alt]);

  async function uploadFiles(fileList: FileList | File[], replaceTarget?: string) {
    if (!fileList.length) return;
    setUploading(true);
    const formData = new FormData();
    for (const file of Array.from(fileList)) formData.append("files", file);
    if (replaceTarget) {
      formData.set("replace", "true");
      formData.set("targetName", replaceTarget);
    }

    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      const first = data.uploaded?.[0] as MediaFile | undefined;
      showToast(replaceTarget ? "Image replaced." : `Uploaded ${data.uploaded.length} file(s).`, true);
      await load(first?.name ?? replaceTarget);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed.", false);
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const blocked = data as { error?: string; usage?: MediaUsage[]; inUse?: boolean };
      if (blocked.inUse && blocked.usage) {
        setFiles((prev) =>
          prev.map((file) =>
            file.name === name
              ? { ...file, usage: blocked.usage ?? [], usageCount: blocked.usage?.length ?? 0 }
              : file,
          ),
        );
      }
      showToast(blocked.error ?? "Delete failed.", false);
      return;
    }
    setFiles((prev) => prev.filter((file) => file.name !== name));
    if (selectedName === name) setSelectedName(null);
    showToast("File deleted.", true);
  }

  async function saveAlt() {
    if (!selected) return;
    setSavingAlt(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected.name, alt: altDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to save alt text.");
      setFiles((prev) => prev.map((file) => file.name === selected.name ? { ...file, alt: data.alt ?? "" } : file));
      showToast("Alt text saved.", true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save alt text.", false);
    } finally {
      setSavingAlt(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Copied ${url}`, true);
    } catch {
      showToast("Could not copy the URL.", false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
  }

  if (loading) return <div className="sa-card"><div className="sa-empty"><div className="sa-empty__title">Loading media…</div></div></div>;

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Content</span>
          <h1 className="sa-h1">Media</h1>
          <p className="sa-subtitle">Upload, reuse and describe the images used across this deployment.</p>
        </div>
        <div className="sa-page-header__actions">
          <button className="sa-btn sa-btn--primary" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload images"}
          </button>
        </div>
      </section>

      <section className="sa-stats sa-stats--dashboard" aria-label="Media overview">
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Images</div>
          <div className="sa-stat__value">{files.length}</div>
          <div className="sa-stat__desc">Files in the library</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Storage</div>
          <div className="sa-stat__value sa-stat__value--sm">{formatBytes(totalBytes)}</div>
          <div className="sa-stat__desc">Current local media size</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Protected</div>
          <div className="sa-stat__value">{files.filter((file) => file.usageCount > 0).length}</div>
          <div className="sa-stat__desc">Images referenced by content</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Metadata</div>
          <div className="sa-stat__value">{files.filter((file) => file.alt.trim()).length}</div>
          <div className="sa-stat__desc">Images with alt text</div>
        </article>
      </section>

      <section
        className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
      >
        <div className={styles.dropIcon} aria-hidden="true">↑</div>
        <div>
          <strong>{uploading ? "Uploading…" : "Drop images here"}</strong>
          <span>or click to browse · JPG, PNG, WebP, GIF, SVG, AVIF, ICO · max 10 MB each</span>
        </div>
      </section>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.currentTarget.files?.length) void uploadFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

      {files.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__title">No media yet</div>
            <div className="sa-empty__desc">Upload the first image and it will become available to pages and blocks.</div>
          </div>
        </div>
      ) : (
        <div className={styles.workspace}>
          <section className="sa-card">
            <div className={styles.libraryHeader}>
              <div>
                <span className="sa-card__eyebrow">Library</span>
                <h2>Images</h2>
              </div>
              <label className={styles.search}>
                <span className="sr-only">Search media</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files or alt text…" />
              </label>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="sa-empty sa-empty--compact">
                <div className="sa-empty__title">No matches</div>
                <div className="sa-empty__desc">Try another file name or alt-text search.</div>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredFiles.map((file) => (
                  <article key={file.name} className={`${styles.item} ${selectedName === file.name ? styles.itemSelected : ""}`}>
                    <button className={styles.preview} type="button" onClick={() => setSelectedName(file.name)} aria-label={`Open ${file.name}`}>
                      <img src={file.url} alt={file.alt || ""} loading="lazy" />
                    </button>
                    <div className={styles.itemBody}>
                      <button className={styles.fileName} type="button" onClick={() => setSelectedName(file.name)} title={file.name}>{file.name}</button>
                      <div className={styles.fileMeta}>
                        {formatBytes(file.size)} · {file.alt ? "Alt set" : "No alt"} · {file.usageCount ? `Used ${file.usageCount}×` : "Unused"}
                      </div>
                      <div className={styles.itemActions}>
                        <button type="button" onClick={() => void copyUrl(file.url)}>Copy URL</button>
                        <button type="button" onClick={() => setSelectedName(file.name)}>Details</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={`sa-card ${styles.inspector}`}>
            {selected ? (
              <>
                <div className={styles.inspectorPreview}><img src={selected.url} alt={selected.alt || ""} /></div>
                <div className={styles.inspectorHeading}>
                  <span className="sa-card__eyebrow">Selected image</span>
                  <h2 title={selected.name}>{selected.name}</h2>
                </div>
                <dl className={styles.metaList}>
                  <div><dt>URL</dt><dd><code>{selected.url}</code></dd></div>
                  <div><dt>Size</dt><dd>{formatBytes(selected.size)}</dd></div>
                  <div><dt>Updated</dt><dd>{formatDate(selected.modifiedAt)}</dd></div>
                  <div><dt>Usage</dt><dd>{selected.usageCount ? `${selected.usageCount} reference${selected.usageCount === 1 ? "" : "s"}` : "Unused"}</dd></div>
                </dl>

                <section className={styles.usagePanel}>
                  <div className={styles.usageHead}>
                    <strong>Used in</strong>
                    <span className={selected.usageCount ? styles.usageBadgeProtected : styles.usageBadgeSafe}>
                      {selected.usageCount || "0"}
                    </span>
                  </div>
                  {selected.usageCount ? (
                    <div className={styles.usageList}>
                      {selected.usage.map((usage, index) => {
                        const content = (
                          <>
                            <strong>{usage.label}</strong>
                            <small>{usage.source} · {usage.field}</small>
                          </>
                        );
                        return usage.href ? (
                          <a href={usage.href} className={styles.usageItem} key={`${usage.source}-${usage.field}-${index}`}>
                            {content}<span aria-hidden="true">→</span>
                          </a>
                        ) : (
                          <div className={styles.usageItem} key={`${usage.source}-${usage.field}-${index}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.usageSafe}>No references found in the active site content. This image can be deleted safely.</div>
                  )}
                </section>

                <div className="sa-field">
                  <label htmlFor="media-alt">Alt text</label>
                  <textarea id="media-alt" rows={4} value={altDraft} onChange={(event) => setAltDraft(event.target.value)} placeholder="Describe the image for accessibility and SEO." />
                  <div className="sa-field-hint">Describe what matters in the image. Leave empty for purely decorative images.</div>
                </div>
                <button className="sa-btn sa-btn--primary" type="button" onClick={() => void saveAlt()} disabled={savingAlt || altDraft === selected.alt}>
                  {savingAlt ? "Saving…" : "Save alt text"}
                </button>

                <div className={styles.inspectorActions}>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" type="button" onClick={() => void copyUrl(selected.url)}>Copy URL</button>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" type="button" onClick={() => replaceInputRef.current?.click()} disabled={uploading}>Replace</button>
                  <button
                    className="sa-btn sa-btn--danger sa-btn--sm"
                    type="button"
                    onClick={() => void deleteFile(selected.name)}
                    disabled={selected.usageCount > 0}
                    title={selected.usageCount > 0 ? "Remove all content references before deleting this image." : undefined}
                  >
                    Delete
                  </button>
                </div>
                {selected.usageCount > 0 ? (
                  <div className={styles.deleteGuard}>
                    Protected from deletion. Replace this file to keep its public URL, or remove the references listed above first.
                  </div>
                ) : null}
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    if (event.currentTarget.files?.length) void uploadFiles(event.currentTarget.files, selected.name);
                    event.currentTarget.value = "";
                  }}
                />
              </>
            ) : (
              <div className="sa-empty sa-empty--compact">
                <div className="sa-empty__title">Select an image</div>
                <div className="sa-empty__desc">Choose an item from the library to edit metadata, copy its URL, replace it or delete it.</div>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
