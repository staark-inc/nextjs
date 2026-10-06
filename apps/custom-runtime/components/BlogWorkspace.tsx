"use client";
import { useEffect, useRef, useState } from "react";
import type { EditableBlogPost, BlogBodyBlock, BlogImage } from "@staark/addon-blog/content";
import { ImagePicker } from "./MediaLibrary";
type Document = { projectKey: string; post: EditableBlogPost; revision: string | null; originalSlug: string | null };
type Collection = { config: { basePath: string; title: string }; revision: string | null; posts: Omit<EditableBlogPost, "paragraphs" | "body">[] };
export function BlogWorkspace({ projectKey, csrf, onDirty, onBusy }: { projectKey: string; csrf: string; onDirty(value: boolean): void; onBusy(value: boolean): void }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = !!document && JSON.stringify(document.post) !== saved;
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => { if (preview) dialog.current?.showModal(); }, [preview]);
  async function request<T>(endpoint: string, input?: unknown): Promise<T> {
    const response = await fetch(`/api/admin/blog/${endpoint}`, { cache: "no-store", method: input ? "PUT" : "GET", headers: { "Content-Type": "application/json", "X-Admin-CSRF": csrf }, ...(input ? { body: JSON.stringify(input) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }
  async function refresh() { const next = await request<Collection>("posts"); setCollection(next); return next; }
  useEffect(() => { void refresh().catch(cause => setError(cause.message)); }, []);
  function mayLeave() { return !dirty || window.confirm("Discard unsaved article changes?"); }
  async function open(slug: string) {
    if (!mayLeave()) return;
    setBusy(true); setError(""); setNotice("");
    try { const next = await request<Document>(`post?slug=${encodeURIComponent(slug)}`); setDocument(next); setSaved(JSON.stringify(next.post)); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  async function create() {
    if (!mayLeave()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const latest = await refresh();
      setDocument({ projectKey, revision: latest.revision, originalSlug: null, post: { slug: "new-article", title: "New article", excerpt: "", paragraphs: [], body: [], status: "draft", seo: { noindex: false } } }); setSaved("");
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  function edit(post: EditableBlogPost) { setDocument(old => old ? { ...old, post } : null); setNotice(""); }
  async function save(withPreview = false) {
    if (!document) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const input = { ...document, post: { ...document.post, ...(document.post.status === "published" && !document.post.publishedAt ? { publishedAt: new Date().toISOString() } : {}) } };
      const next = await request<Document>("post", input); setDocument(next); setSaved(JSON.stringify(next.post));
      setNotice(next.post.status === "draft" ? "Draft saved. Only the authenticated preview can show it." : Date.parse(next.post.publishedAt!) > Date.now() ? "Saved. It will appear publicly at the publication time." : "Article published.");
      await refresh();
      if (withPreview) setPreview(`/admin/blog/preview?slug=${encodeURIComponent(next.post.slug)}&v=${Date.now()}`);
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  const post = document?.post;
  const body = post?.body ?? [];
  function updateBody(next: BlogBodyBlock[]) { if (post) edit({ ...post, body: next }); }
  function updateBlock(index: number, next: BlogBodyBlock) { updateBody(body.map((old, at) => at === index ? next : old)); }
  function imageSettings(image: BlogImage | undefined, setImage: (image?: BlogImage) => void, label: string) {
    return <fieldset className="ce-group"><legend>{label}</legend>{image && <><img className="ce-image-preview" src={image.src} alt={image.alt} width={image.width} height={image.height} /><label className="ce-field">Alternative text<input maxLength={500} value={image.alt} onChange={event => setImage({ ...image, alt: event.target.value })} /></label><label className="ce-field">Caption<input maxLength={1000} value={image.caption} onChange={event => setImage({ ...image, caption: event.target.value })} /></label><button type="button" onClick={() => setImage(undefined)}>Remove image</button></>}<ImagePicker csrf={csrf} onSelect={setImage} label={image ? "Replace image" : "Choose image"} /></fieldset>;
  }
  return <><header className="ce-topbar"><div><span className="ce-kicker">{projectKey} / Blog</span><h1>{post?.title ?? "Your stories."}</h1></div><div className="ce-actions">{post && <><span className="ce-status" data-status={dirty ? "unsaved" : post.status}>{dirty ? "Unsaved changes" : post.status}</span>{document?.originalSlug && <button disabled={busy} onClick={() => void open(document.originalSlug!)}>Reload</button>}<button disabled={busy} onClick={() => void save(true)}>Save & preview</button><button disabled={busy} className="ce-primary" onClick={() => void save()}>{busy ? "Saving…" : "Save article"}</button></>}<button disabled={busy || !collection} onClick={() => void create()}>+ New article</button></div></header>
    {error && <div className="ce-error" role="alert">{error}</div>}{notice && <div className="ce-notice" role="status">{notice}</div>}
    <div className="ce-content-layout"><aside className="ce-page-list"><div className="ce-section-head"><h2>Articles</h2></div>{collection?.posts.map(item => <button disabled={busy} className={document?.originalSlug === item.slug ? "active" : ""} key={item.slug} onClick={() => void open(item.slug)}><strong>{item.title}</strong><small>{item.slug} · {item.status}{item.status === "published" && Date.parse(item.publishedAt!) > Date.now() ? " · scheduled" : ""}</small></button>)}{collection && !collection.posts.length && <p className="ce-empty">No articles yet.</p>}</aside>
    {post && document ? <div className="ce-editor ce-blog-editor"><fieldset disabled={busy} className="ce-page-settings"><div className="ce-section-head"><h2>Article settings</h2>{document.originalSlug && <a target="_blank" rel="noreferrer" href={`${collection?.config.basePath}/${post.slug}`}>Public URL ↗</a>}</div><div className="ce-settings-grid"><label className="ce-field">Title<input maxLength={200} value={post.title} onChange={event => edit({ ...post, title: event.target.value })} /></label><label className="ce-field">Slug<input disabled={document.originalSlug !== null} maxLength={120} value={post.slug} onChange={event => edit({ ...post, slug: event.target.value })} /><small>Lowercase words separated by hyphens. Existing URLs are fixed.</small></label><label className="ce-field">Visibility<select value={post.status} onChange={event => edit({ ...post, status: event.target.value as EditableBlogPost["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="ce-field">Publication time (UTC)<input type="datetime-local" value={post.publishedAt?.slice(0, 16) ?? ""} onChange={event => edit({ ...post, publishedAt: event.target.value ? new Date(event.target.value + ":00Z").toISOString() : undefined })} /><small>Leave empty to publish now. Future dates schedule publication.</small></label></div><label className="ce-field">Excerpt<textarea maxLength={600} value={post.excerpt} onChange={event => edit({ ...post, excerpt: event.target.value })} /></label>
      {imageSettings(post.cover, cover => edit({ ...post, cover }), "Cover image")}
      <details><summary>Search & sharing</summary><div className="ce-settings-grid"><label className="ce-field">SEO title<input maxLength={200} value={post.seo?.title ?? ""} onChange={event => edit({ ...post, seo: { ...post.seo, noindex: post.seo?.noindex ?? false, title: event.target.value } })} /></label><label className="ce-field">Description<textarea maxLength={1000} value={post.seo?.description ?? ""} onChange={event => edit({ ...post, seo: { ...post.seo, noindex: post.seo?.noindex ?? false, description: event.target.value } })} /></label><label className="ce-checkbox"><input type="checkbox" checked={post.seo?.noindex ?? false} onChange={event => edit({ ...post, seo: { ...post.seo, noindex: event.target.checked } })} />Hide from search engines</label></div>{imageSettings(post.seo?.image, image => edit({ ...post, seo: { ...post.seo, noindex: post.seo?.noindex ?? false, image } }), "Sharing image (defaults to cover)")}</details>
    </fieldset><fieldset disabled={busy} className="ce-card ce-article-body"><div className="ce-section-head"><h2>Article content</h2><small>{body.length} blocks</small></div>
      {body.map((block, index) => <section className="ce-group" key={index}><div className="ce-section-head"><strong>{index + 1} · {block.type}</strong><div className="ce-actions"><button type="button" aria-label="Move content up" disabled={index === 0} onClick={() => { const next = [...body]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; updateBody(next); }}>↑</button><button type="button" aria-label="Move content down" disabled={index === body.length - 1} onClick={() => { const next = [...body]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; updateBody(next); }}>↓</button><button type="button" onClick={() => updateBody(body.filter((_, at) => at !== index))}>Remove</button></div></div>
        {block.type === "paragraph" || block.type === "heading" ? <label className="ce-field">Text<textarea rows={block.type === "heading" ? 2 : 5} maxLength={block.type === "heading" ? 200 : 20000} value={block.text} onChange={event => updateBlock(index, { ...block, text: event.target.value })} /></label>
          : block.type === "list" ? <><label className="ce-field">Items (one per line)<textarea rows={5} value={block.items.join("\n")} onChange={event => updateBlock(index, { ...block, items: event.target.value.split("\n") })} /></label><label className="ce-checkbox"><input type="checkbox" checked={block.ordered} onChange={event => updateBlock(index, { ...block, ordered: event.target.checked })} />Numbered list</label></>
          : block.type === "link" ? <><label className="ce-field">Label<input value={block.label} onChange={event => updateBlock(index, { ...block, label: event.target.value })} /></label><label className="ce-field">URL<input value={block.href} onChange={event => updateBlock(index, { ...block, href: event.target.value })} /></label></>
          : imageSettings(block.image, image => { if (image) updateBlock(index, { type: "image", image }); else updateBody(body.filter((_, at) => at !== index)); }, "Article image")}
      </section>)}
      {!body.length && <p className="ce-empty">Start your article with a paragraph or a heading.</p>}
      <div className="ce-actions ce-body-add">{(["paragraph", "heading", "list", "link"] as const).map(type => <button type="button" key={type} onClick={() => updateBody([...body, type === "list" ? { type, items: [""], ordered: false } : type === "link" ? { type, label: "", href: "/" } : { type, text: "" }])}>+ {type}</button>)}<ImagePicker csrf={csrf} label="+ image" onSelect={image => updateBody([...body, { type: "image", image }])} /></div>
    </fieldset></div> : <section className="ce-card ce-empty"><h2>A place for your stories.</h2><p>Choose an article, or start a new draft.</p><button className="ce-primary" disabled={busy || !collection} onClick={() => void create()}>+ New article</button></section>}</div>
    {preview && <dialog ref={dialog} className="ce-preview-overlay" aria-label="Saved article preview" onCancel={() => setPreview(null)}><div className="ce-preview-controls"><strong>Saved article preview</strong><a href={preview} target="_blank" rel="noreferrer">Open in a new tab ↗</a><button autoFocus onClick={() => setPreview(null)}>Close preview</button></div><iframe title="Article preview" src={preview} /></dialog>}
  </>;
}
