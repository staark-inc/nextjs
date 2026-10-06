"use client";
import { useEffect, useRef, useState } from "react";
import type { BlogImage } from "@staark/addon-blog/content";
import type { MediaItem } from "@/lib/editor-media";
export function MediaLibrary({ csrf, onSelect, onBusy }: { csrf: string; onSelect?(image: BlogImage): void; onBusy?(busy: boolean): void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  async function load() {
    setError("");
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (mounted.current) setItems(data.items);
    } catch (cause) { if (mounted.current) setError((cause as Error).message); }
    finally { if (mounted.current) setLoaded(true); }
  }
  useEffect(() => { void load(); }, []);
  return <section className="ce-media"><div className="ce-section-head"><div><h2>Project images</h2><p>JPEG, PNG or static WebP · up to 5 MiB · converted to WebP</p></div><button type="button" disabled={busy} onClick={() => void load()}>Refresh</button></div>
    {error && <p className="ce-error" role="alert">{error}</p>}{notice && <p className="ce-notice" role="status">{notice}</p>}
    <form className="ce-media-upload" onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
      if (!(file instanceof File) || !file.size) { setError("Select an image."); return; }
      if (file.size > 5 * 1024 * 1024) { setError("Use an image up to 5 MiB."); return; }
      setBusy(true); setError(""); setNotice("");
      try {
        const query = new URLSearchParams({ alt: String(data.get("alt") ?? ""), name: String(data.get("name") || file.name).slice(0, 160) });
        const response = await fetch(`/api/admin/media?${query}`, { method: "POST", headers: { "Content-Type": file.type, "X-Admin-CSRF": csrf }, body: file });
        const image = await response.json();
        if (!response.ok) throw new Error(image.error);
        setItems(old => [...old, image]); form.reset(); setNotice("Image uploaded. Select it below to use it.");
      } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
    }}><fieldset disabled={busy}><label className="ce-field">Image file<input name="file" type="file" required accept="image/jpeg,image/png,image/webp" /></label><label className="ce-field">Alternative text<input name="alt" required maxLength={500} placeholder="Describe the image for readers" /></label><label className="ce-field">Name (optional)<input name="name" maxLength={160} /></label><button className="ce-primary" type="submit">{busy ? "Uploading…" : "Upload image"}</button></fieldset></form>
    <label className="ce-field">Find an image<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or alternative text…" /></label>
    {!loaded && <p>Loading images…</p>}{loaded && !items.length && <p className="ce-empty">Upload your first project image.</p>}
    <div className="ce-media-grid">{items.filter(item => `${item.name} ${item.alt}`.toLowerCase().includes(search.toLowerCase())).map(item => <article className="ce-media-item" key={item.id}>
      <img src={item.src} alt={item.alt} width={item.width} height={item.height} loading="lazy" /><strong>{item.name}</strong><small>{item.width} × {item.height} · {Math.ceil(item.bytes / 1024)} KB</small><p>{item.alt}</p>
      {onSelect ? <button type="button" disabled={busy} onClick={() => onSelect({ src: item.src, alt: item.alt, width: item.width, height: item.height, caption: item.caption })}>Use image</button> : <a href={`${item.src}?view=1`} target="_blank" rel="noreferrer">Open image ↗</a>}
    </article>)}</div>
  </section>;
}
export function ImagePicker({ csrf, onSelect, label = "Choose image" }: { csrf: string; onSelect(image: BlogImage): void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  return <><button type="button" className="ce-add-small" onClick={() => setOpen(true)}>{label}</button>{open && <dialog ref={dialog} className="ce-media-dialog" aria-label="Choose a project image" onCancel={event => { if (busy) event.preventDefault(); else setOpen(false); }}><div className="ce-section-head"><h2>Image library</h2><button autoFocus type="button" disabled={busy} onClick={() => setOpen(false)}>Close</button></div><MediaLibrary csrf={csrf} onBusy={setBusy} onSelect={image => { onSelect(image); setOpen(false); }} /></dialog>}</>;
}
