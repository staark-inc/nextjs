"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockDefinition, BlockField } from "@staark/theme-kit/block";
import { BlogWorkspace } from "./BlogWorkspace";
import { MediaLibrary, ImagePicker } from "./MediaLibrary";
import type { EditorPage } from "@/lib/editor-store";

type Summary = { path: string; title: string; status: "draft" | "published"; blocks: number; updatedAt?: string };
type Bootstrap = { project: { key: string; name: string; version: string }; theme: { family: string; variant?: string }; addons: string[]; csrf: string; pages: Summary[]; blocks: BlockDefinition[]; shortcuts: Record<string, string> };
type Document = { page: EditorPage; revision: string | null };
const links: BlockField[] = [{ name: "label", label: "Label", type: "text" }, { name: "href", label: "URL", type: "text" }];
function emptyValue(field: BlockField): unknown {
  if (field.type === "boolean") return false;
  if (field.type === "number") return field.name === "width" ? 1200 : field.name === "height" ? 900 : 0;
  if (field.type === "array") return [];
  if (field.type === "select") { const option = field.options?.[0]; return typeof option === "object" ? option.value : option ?? ""; }
  if (field.type === "object" || field.type === "link") return Object.fromEntries((field.fields ?? links).map(child => [child.name, emptyValue(child)]));
  return "";
}
function Fields({ fields, value, onChange, prefix, csrf }: { csrf: string; fields: readonly BlockField[]; value: Record<string, unknown>; onChange(value: Record<string, unknown>): void; prefix: string }) {
  function update(name: string, next: unknown) {
    const result = { ...value };
    if (next === undefined) delete result[name]; else result[name] = next;
    onChange(result);
  }
  return <>{fields.some(field => field.name === "src") && <ImagePicker csrf={csrf} onSelect={image => onChange({ ...value, ...image })} label="Choose from image library" />}{fields.map(field => {
    const id = `${prefix}-${field.name}`;
    const current = value[field.name];
    if (field.type === "array") {
      const items = Array.isArray(current) ? current : [];
      const children = field.fields;
      return <fieldset className="ce-group" key={id}><legend>{field.label} <span>{items.length}</span></legend>
        {items.map((item, index) => <div className="ce-array-item" key={`${id}-${index}`}><div className="ce-array-tools"><span>{index + 1}</span>
          <button type="button" aria-label={`Move ${field.label} item ${index + 1} up`} disabled={index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(field.name, next); }}>↑</button>
          <button type="button" aria-label={`Move ${field.label} item ${index + 1} down`} disabled={index === items.length - 1} onClick={() => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update(field.name, next); }}>↓</button>
          <button type="button" onClick={() => update(field.name, items.filter((_, at) => at !== index))}>Remove</button></div>
          {children ? <Fields csrf={csrf} fields={children} value={item && typeof item === "object" ? item as Record<string, unknown> : {}} prefix={`${id}-${index}`} onChange={next => update(field.name, items.map((old, at) => at === index ? next : old))} /> : <label className="ce-field" htmlFor={`${id}-${index}`}>Paragraph {index + 1}<textarea id={`${id}-${index}`} value={String(item)} onChange={event => update(field.name, items.map((old, at) => at === index ? event.target.value : old))} /></label>}
        </div>)}
        <button type="button" className="ce-add-small" onClick={() => update(field.name, [...items, children ? Object.fromEntries(children.map(child => [child.name, emptyValue(child)])) : ""])}>+ Add item</button>
        {field.help && <small>{field.help}</small>}
      </fieldset>;
    }
    if (field.type === "object" || field.type === "link") return <fieldset className="ce-group" key={id}><legend>{field.label}</legend>
      {current && typeof current === "object" ? <><Fields csrf={csrf} fields={field.fields ?? links} value={current as Record<string, unknown>} prefix={id} onChange={next => update(field.name, next)} /><button type="button" className="ce-add-small" onClick={() => update(field.name, undefined)}>Remove {field.label.toLowerCase()}</button></> : <button type="button" onClick={() => update(field.name, emptyValue(field))}>+ Add {field.label.toLowerCase()}</button>}
    </fieldset>;
    if (field.type === "boolean") return <label className="ce-checkbox" key={id}><input id={id} type="checkbox" checked={Boolean(current)} onChange={event => update(field.name, event.target.checked)} />{field.label}</label>;
    return <label className="ce-field" key={id} htmlFor={id}>{field.label}
      {field.type === "textarea" ? <textarea id={id} rows={3} value={String(current ?? "")} onChange={event => update(field.name, event.target.value || undefined)} />
        : field.type === "select" ? <select id={id} value={String(current ?? "")} onChange={event => { const option = field.options?.find(option => String(typeof option === "object" ? option.value : option) === event.target.value); update(field.name, typeof option === "object" ? option.value : option); }}>
          <option value="">Choose…</option>{field.options?.map(option => { const item = typeof option === "object" ? option : { value: option, label: String(option) }; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select>
          : <input id={id} type={field.type === "number" ? "number" : "text"} min={field.min} max={field.max} placeholder={field.placeholder} value={String(current ?? "")} onChange={event => update(field.name, event.target.value === "" ? undefined : field.type === "number" ? Number(event.target.value) : event.target.value)} />}
      {field.help && <small>{field.help}</small>}
    </label>;
  })}</>;
}

export function CustomEditor() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [screen, setScreen] = useState<"loading" | "login" | "ready" | "unavailable">("loading");
  const [view, setView] = useState<"overview" | "pages" | "blog" | "media">("overview");
  const [document, setDocument] = useState<Document | null>(null);
  const [saved, setSaved] = useState("");
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const [externalDirty, setExternalDirty] = useState(false);
  const dirty = externalDirty || !!document && JSON.stringify(document.page) !== saved;

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(() => { if (preview) previewDialog.current?.showModal(); }, [preview]);
  async function request<T>(endpoint: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`/api/admin/${endpoint}`, { method, cache: "no-store", headers: { "Content-Type": "application/json", ...(boot ? { "X-Admin-CSRF": boot.csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) setScreen("login");
      if (response.status === 503) setScreen("unavailable");
      throw new Error(result.error ?? "Request failed.");
    }
    return result as T;
  }
  async function bootstrap() {
    try { setBoot(await request<Bootstrap>("bootstrap")); setScreen("ready"); }
    catch (cause) { setError((cause as Error).message); setScreen(old => old === "loading" ? "unavailable" : old); }
  }
  useEffect(() => { void bootstrap(); }, []); // Initial authentication check; no credentials in the page payload.
  function mayLeave() { return !dirty || window.confirm("Discard unsaved changes?"); }
  function navigate(next: typeof view) {
    if (!mayLeave()) return;
    setView(next); setExternalDirty(false);
    if (next !== "pages") { setDocument(null); setSaved(""); }
    setError(""); setNotice("");
  }
  function edit(page: EditorPage) { setDocument(old => old ? { ...old, page } : null); setNotice(""); }
  function setBlocks(blocks: EditorPage["blocks"]) { if (document) edit({ ...document.page, blocks }); }
  async function openPage(url: string) {
    if (!mayLeave()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await request<Document>(`page?path=${encodeURIComponent(url)}`);
      setDocument(next); setSaved(JSON.stringify(next.page)); setSelected(0); setView("pages"); setPicker(false);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  function newPage() {
    if (!boot || !mayLeave()) return;
    const page: EditorPage = { projectKey: boot.project.key, path: "/new-page", title: "New page", status: "draft", seo: { noindex: false }, blocks: [] };
    setDocument({ page, revision: null }); setSaved(""); setSelected(0); setView("pages"); setPicker(true); setError(""); setNotice("");
  }
  async function save(withPreview = false) {
    if (!document) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await request<Document>("page", "PUT", document);
      setDocument(next); setSaved(JSON.stringify(next.page)); setNotice(next.page.status === "draft" ? "Draft saved. It is visible only in the authenticated preview." : "Saved and published.");
      if (withPreview) setPreview(`/admin/preview?path=${encodeURIComponent(next.page.path)}&v=${Date.now()}`);
      await bootstrap();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function removePage() {
    if (!document || document.revision === null || document.page.path === "/") return;
    const { page, revision } = document;
    if (!window.confirm(`Delete “${page.title}” (${page.path})? It will disappear from the website. A saved copy stays in history.${dirty ? " Unsaved changes will be discarded." : ""}`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request("page", "DELETE", { projectKey: boot!.project.key, path: page.path, revision });
      setDocument(null); setSaved(""); setSelected(0); setPicker(false);
      setBoot(old => old ? { ...old, pages: old.pages.filter(item => item.path !== page.path) } : old);
      await bootstrap(); setNotice(`Deleted ${page.path}. A copy is preserved in history.`);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (!mayLeave()) return;
    setBusy(true); setError("");
    try { await request("logout", "POST"); setBoot(null); setDocument(null); setSaved(""); setScreen("login"); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  if (screen !== "ready" || !boot) return <main className="ce-login"><div className="ce-login-art"><span className="ce-wordmark">staark <i>custom</i></span><div className="ce-orbit" /><h1>Your content.<br />Your direction.</h1><p>A workspace for the project you are building.</p></div><section className="ce-login-panel"><span className="ce-kicker">Custom workspace</span><h2>{screen === "loading" ? "Opening workspace…" : screen === "unavailable" ? "Workspace unavailable" : "Welcome back"}</h2>
    {error && screen !== "loading" && <p className="ce-error" role="alert">{error}</p>}
    {screen === "login" && <form onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(""); try { await request("login", "POST", { username: data.get("username"), password: data.get("password") }); await bootstrap(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }}><fieldset disabled={busy}><label className="ce-field">Username<input name="username" autoComplete="username" required maxLength={100} /></label><label className="ce-field">Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label><button className="ce-primary" type="submit">{busy ? "Signing in…" : "Sign in →"}</button></fieldset></form>}
    <a href="/">← Back to website</a></section></main>;

  const page = document?.page;
  const block = page?.blocks[selected];
  const definition = boot.blocks.find(item => item.type === block?.type);
  const matching = boot.blocks.filter(item => `${item.type} ${item.label} ${item.category} ${Object.entries(boot.shortcuts).filter(([, type]) => type === item.type).map(([alias]) => alias).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="ce-app"><aside className="ce-sidebar"><a className="ce-wordmark" href="/admin">staark <i>custom</i></a><div className="ce-project"><span className="ce-avatar">{boot.project.name.slice(0, 1)}</span><div><strong>{boot.project.name}</strong><small>{boot.project.key}</small></div></div><span className="ce-nav-label">Workspace</span><nav aria-label="Workspace"><button className={view === "overview" ? "active" : ""} disabled={busy} onClick={() => { navigate("overview"); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg><span>Overview</span></button><button className={view === "pages" ? "active" : ""} disabled={busy} onClick={() => navigate("pages")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg><span>Pages & blocks</span></button>{boot.addons.includes("blog") && <button disabled={busy} className={view === "blog" ? "active" : ""} onClick={() => navigate("blog")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 5v15M3 4.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5V19c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5z" /></svg><span>Blog articles</span></button>}<button disabled={busy} className={view === "media" ? "active" : ""} onClick={() => navigate("media")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></svg><span>Image library</span></button></nav><div className="ce-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer">Open website ↗</a><small>{boot.theme.family} / {boot.theme.variant ?? "default"}</small><button disabled={busy} onClick={() => void logout()}>Sign out</button></div></aside>
    <main className="ce-main">{view === "blog" ? <BlogWorkspace projectKey={boot.project.key} csrf={boot.csrf} onDirty={setExternalDirty} onBusy={setBusy} /> : view === "media" ? <><header className="ce-topbar"><div><span className="ce-kicker">{boot.project.key} / Media</span><h1>Image library.</h1></div></header><div className="ce-card"><MediaLibrary csrf={boot.csrf} onBusy={setBusy} /></div></> : <><header className="ce-topbar"><div><span className="ce-kicker">{boot.project.key} / {view === "overview" ? "Overview" : "Content"}</span><h1>{view === "overview" ? "Make it yours." : page?.title ?? "Pages & blocks"}</h1></div><div className="ce-actions">{page ? <><span data-status={dirty ? "unsaved" : page.status} className={`ce-status ${dirty ? "ce-status--dirty" : ""}`}>{dirty ? "Unsaved changes" : page.status}</span>{document?.revision !== null && <><button disabled={busy} onClick={() => void openPage(page.path)}>Reload</button>{page.path !== "/" && <button className="ce-danger" disabled={busy} onClick={() => void removePage()}>Delete page</button>}</>}<button disabled={busy} onClick={() => void save(true)}>Save & preview</button><button className="ce-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save changes"}</button></> : <button className="ce-primary" disabled={busy} onClick={newPage}>+ New page</button>}</div></header>
      {error && <div className="ce-error" role="alert">{error}</div>}{notice && <div className="ce-notice" role="status">{notice}</div>}
      {view === "overview" ? <><section className="ce-welcome"><div><span className="ce-kicker">An independent space</span><h2>Good ideas deserve<br />a place of their own.</h2><p>Edit your pages, shape each section and publish when you are ready.</p><button onClick={() => void openPage("/")} disabled={busy}>Edit home page →</button></div><div className="ce-welcome-shape" aria-hidden="true" /></section><section className="ce-stats" aria-label="Project overview"><div><small>Pages</small><strong>{boot.pages.length}</strong><span>{boot.pages.filter(item => item.status === "draft").length} drafts</span></div><div><small>Building blocks</small><strong>{boot.blocks.length}</strong><span>Ready to add and extend</span></div><div><small>Active addons</small><strong>{boot.addons.length}</strong><span>{boot.addons.join(" · ") || "None"}</span></div></section><section className="ce-card"><div className="ce-section-head"><h2>Your pages</h2><button onClick={() => navigate("pages")}>View all →</button></div><div className="ce-page-table">{boot.pages.slice(0, 6).map(item => <button key={item.path} disabled={busy} onClick={() => void openPage(item.path)}><span><strong>{item.title}</strong><small>{item.path}</small></span><span className="ce-status" data-status={item.status}>{item.status}</span><span>{item.blocks} blocks →</span></button>)}</div></section></>
        : <div className="ce-content-layout"><aside className="ce-page-list"><div className="ce-section-head"><h2>Pages</h2><button aria-label="New page" disabled={busy} onClick={newPage}>+</button></div>{boot.pages.map(item => <button disabled={busy} className={page?.path === item.path && document?.revision !== null ? "active" : ""} key={item.path} onClick={() => void openPage(item.path)}><strong>{item.title}</strong><small>{item.path} <span>{item.status === "draft" ? "· draft" : ""}</span></small></button>)}</aside>
          {page && document ? <div className="ce-editor"><fieldset disabled={busy} className="ce-page-settings"><div className="ce-section-head"><h2>Page settings</h2><a href={page.path} target="_blank" rel="noreferrer">Public URL ↗</a></div><div className="ce-settings-grid ce-settings-grid--primary"><label className="ce-field">Page title<input value={page.title} onChange={event => edit({ ...page, title: event.target.value })} /></label><label className="ce-field">URL<input value={page.path} disabled={document.revision !== null} onChange={event => edit({ ...page, path: event.target.value })} /><small>{document.revision !== null ? "Existing page URLs are fixed." : "Lowercase path, e.g. /about or /guides/start."}</small></label><label className="ce-field">Visibility<select value={page.status} disabled={page.path === "/"} onChange={event => edit({ ...page, status: event.target.value as EditorPage["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></label></div><details><summary>Search & sharing</summary><div className="ce-settings-grid"><label className="ce-field">SEO title<input value={page.seo.title ?? ""} onChange={event => edit({ ...page, seo: { ...page.seo, title: event.target.value } })} /></label><label className="ce-field">Description<textarea value={page.seo.description ?? ""} onChange={event => edit({ ...page, seo: { ...page.seo, description: event.target.value } })} /></label><label className="ce-field">Sharing image URL<input value={page.seo.ogImage ?? ""} onChange={event => edit({ ...page, seo: { ...page.seo, ogImage: event.target.value } })} /></label><ImagePicker csrf={boot.csrf} label="Choose sharing image" onSelect={image => edit({ ...page, seo: { ...page.seo, ogImage: image.src } })} /><label className="ce-checkbox"><input type="checkbox" checked={page.seo.noindex} onChange={event => edit({ ...page, seo: { ...page.seo, noindex: event.target.checked } })} />Hide from search engines</label></div></details></fieldset>
            <div className="ce-block-workspace"><section className="ce-block-list"><div className="ce-section-head"><h2>Sections <small>{page.blocks.length}</small></h2><button disabled={busy} onClick={() => setPicker(!picker)}>+ Add</button></div>{page.blocks.map((item, index) => <div className={`ce-block-row ${index === selected ? "active" : ""}`} key={item.id}><button disabled={busy} className="ce-block-name" onClick={() => { setSelected(index); setPicker(false); }}><small>{String(index + 1).padStart(2, "0")} / {item.type}</small><strong>{String(item.props.heading ?? boot.blocks.find(def => def.type === item.type)?.label ?? item.type).replaceAll("\n", " ")}</strong></button><div className="ce-block-tools"><button disabled={busy || index === 0} aria-label={`Move block ${index + 1} up`} onClick={() => { const next = [...page.blocks]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; setBlocks(next); setSelected(index - 1); }}>↑</button><button disabled={busy || index === page.blocks.length - 1} aria-label={`Move block ${index + 1} down`} onClick={() => { const next = [...page.blocks]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; setBlocks(next); setSelected(index + 1); }}>↓</button></div></div>)}{!page.blocks.length && <p className="ce-empty">Start with a hero, a story or a gallery.</p>}<button className="ce-add-block" disabled={busy} onClick={() => setPicker(true)}>+ Add a section</button></section>
              <section className="ce-properties">{picker ? <><span className="ce-kicker">Block library</span><h2>What comes next?</h2><label className="ce-field">Find a block or shortcut<input value={search} onChange={event => setSearch(event.target.value)} placeholder="hero, photos, questions…" /></label><div className="ce-picker">{matching.map(item => <button key={item.type} disabled={busy} onClick={() => { const next = { id: `block-${crypto.randomUUID()}`, type: item.type, props: structuredClone(item.defaults) }; setBlocks([...page.blocks, next]); setSelected(page.blocks.length); setPicker(false); }}><span className="ce-kicker">{item.category}</span><strong>{item.label}</strong><small>{item.description ?? item.type}</small><span>+ Add section</span></button>)}</div>{!matching.length && <p>No matching blocks.</p>}</>
                : block && definition ? <><div className="ce-section-head"><div><span className="ce-kicker">Section {selected + 1} / {block.type}</span><h2>{definition.label}</h2></div><div className="ce-actions"><button disabled={busy} onClick={() => { const next = { ...structuredClone(block), id: `block-${crypto.randomUUID()}` }; const blocks = [...page.blocks]; blocks.splice(selected + 1, 0, next); setBlocks(blocks); setSelected(selected + 1); }}>Duplicate</button><button disabled={busy} className="ce-danger" onClick={() => { setBlocks(page.blocks.filter((_, index) => index !== selected)); setSelected(Math.max(0, selected - 1)); }}>Remove</button></div></div><fieldset disabled={busy} className="ce-fields"><Fields csrf={boot.csrf} fields={definition.fields} value={block.props} prefix={block.id} onChange={props => setBlocks(page.blocks.map((old, index) => index === selected ? { ...old, props } : old))} /></fieldset></> : <div className="ce-empty"><h2>Build your page.</h2><p>Add a section from the block library to begin.</p><button onClick={() => setPicker(true)}>Open block library →</button></div>}</section>
            </div></div> : <section className="ce-card ce-empty"><h2>A space for every story.</h2><p>Select a page to edit, or create a new draft.</p><button className="ce-primary" onClick={newPage}>+ New page</button></section>}
        </div>}
    </>}</main>{preview && <dialog ref={previewDialog} className="ce-preview-overlay" aria-label="Saved page preview" onCancel={() => setPreview(null)}><div className="ce-preview-controls"><strong>Saved page preview</strong><a href={preview} target="_blank" rel="noreferrer">Open in a new tab ↗</a><button autoFocus onClick={() => setPreview(null)}>Close preview</button></div><iframe title="Project page preview" src={preview} /></dialog>}
  </div>;
}
