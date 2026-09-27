"use client";

import { useEffect, useState } from "react";

type MediaFile = { name: string; url: string; alt?: string; size?: number };

/**
 * Media library picker. Fetches uploaded assets from /api/admin/media and lets
 * the editor pick one for an image field, instead of pasting a URL.
 */
export function MediaPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((d: { files?: MediaFile[] }) => setFiles(d.files ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = query ? files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())) : files;

  return (
    <div className="sa-mp-backdrop" onClick={onClose}>
      <div className="sa-mp" onClick={(e) => e.stopPropagation()}>
        <div className="sa-mp__header">
          <strong>Choose an image</strong>
          <input className="sa-mp__search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <a href="/admin/media" target="_blank" rel="noopener" className="sa-btn sa-btn--ghost sa-btn--sm">Upload ↗</a>
          <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={onClose}>&times;</button>
        </div>
        <div className="sa-mp__body">
          {loading ? (
            <p style={{ padding: 20, color: "var(--sa-muted, #888)" }}>Loading…</p>
          ) : shown.length === 0 ? (
            <p style={{ padding: 20, color: "var(--sa-muted, #888)" }}>
              No images yet. <a href="/admin/media" target="_blank" rel="noopener">Upload some →</a>
            </p>
          ) : (
            <div className="sa-mp__grid">
              {shown.map((f) => (
                <button key={f.url} type="button" className="sa-mp__item" onClick={() => { onPick(f.url); onClose(); }} title={f.name}>
                  <img src={f.url} alt={f.alt || f.name} loading="lazy" />
                  <span className="sa-mp__name">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
