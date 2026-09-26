"use client";

import { useEffect, useState, useRef } from "react";

type MediaFile = { name: string; url: string };

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    setFiles(data.files ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadFiles(fileList: FileList | File[]) {
    setUploading(true);
    const formData = new FormData();
    for (const f of fileList) {
      formData.append("files", f);
    }
    const res = await fetch("/api/admin/media", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      showToast(`Uploaded ${data.uploaded.length} file(s).`, true);
      load();
    } else {
      showToast("Upload failed.", false);
    }
    setUploading(false);
  }

  async function deleteFile(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const res = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.name !== name));
      showToast("File deleted.", true);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>Media</span>
      </div>

      <h1 className="sa-h1">Media</h1>
      <p className="sa-subtitle">Upload and manage images used on your site.</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Images</div>
          <div className="sa-stat__value">{files.length}</div>
          <div className="sa-stat__desc">Uploaded files</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Location</div>
          <div className="sa-stat__value sa-stat__value--sm">public/uploads</div>
          <div className="sa-stat__desc">Served from /uploads/</div>
        </div>
      </div>

      <div
        className={`sa-dropzone${dragActive ? " sa-dropzone--active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
      >
        <div className="sa-dropzone__icon">📁</div>
        <div className="sa-dropzone__text">
          {uploading ? "Uploading..." : "Drop images here or click to browse"}
        </div>
        <div className="sa-dropzone__hint">JPG, PNG, WebP, SVG — max 10 MB per file</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
        />
      </div>

      {files.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__icon">🖼️</div>
            <div className="sa-empty__title">No images yet</div>
            <div className="sa-empty__desc">Upload images to use them in your pages and blocks.</div>
          </div>
        </div>
      ) : (
        <div className="sa-media-grid">
          {files.map((f) => (
            <div key={f.name} className="sa-media-item" onClick={() => {
              navigator.clipboard.writeText(f.url);
              showToast(`Copied: ${f.url}`, true);
            }}>
              <img src={f.url} alt={f.name} loading="lazy" />
              <div className="sa-media-item__name">{f.name}</div>
              <button
                className="sa-media-item__delete"
                onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div>}
    </>
  );
}
