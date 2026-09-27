"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./navigation.module.css";

type Link = { label: string; href: string };
type FooterColumn = { title: string; links: Link[] };
type Navigation = { primary: Link[]; footer: Link[]; footerColumns: FooterColumn[]; cta?: Link };
type PageOption = { path: string; title: string };
type Kind = "primary" | "footer";

const emptyNavigation: Navigation = { primary: [], footer: [], footerColumns: [] };

export default function NavigationPage() {
  const [navigation, setNavigation] = useState<Navigation>(emptyNavigation);
  const [initial, setInitial] = useState("");
  const [pages, setPages] = useState<PageOption[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState("/");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const dirty = useMemo(() => JSON.stringify(navigation) !== initial, [navigation, initial]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    const res = await fetch("/api/admin/navigation", { cache: "no-store" });
    const data = await res.json().catch(() => ({})) as {
      navigation?: Navigation; pages?: PageOption[]; warnings?: string[]; error?: string;
    };
    if (!res.ok) {
      showToast(data.error ?? "Could not load navigation.", false);
      return;
    }
    const next = data.navigation ?? emptyNavigation;
    setNavigation(next);
    setInitial(JSON.stringify(next));
    setPages(data.pages ?? []);
    setWarnings(data.warnings ?? []);
    setSelectedPage(data.pages?.[0]?.path ?? "/");
  }

  useEffect(() => { void load(); }, []);

  function update(kind: Kind, index: number, patch: Partial<Link>) {
    setNavigation((current) => {
      const rows = [...current[kind]];
      rows[index] = { ...rows[index]!, ...patch };
      return { ...current, [kind]: rows };
    });
  }

  function move(kind: Kind, index: number, delta: -1 | 1) {
    setNavigation((current) => {
      const rows = [...current[kind]];
      const target = index + delta;
      if (target < 0 || target >= rows.length) return current;
      [rows[index], rows[target]] = [rows[target]!, rows[index]!];
      return { ...current, [kind]: rows };
    });
  }

  function remove(kind: Kind, index: number) {
    setNavigation((current) => ({
      ...current,
      [kind]: current[kind].filter((_, position) => position !== index),
    }));
  }

  function moveAcross(kind: Kind, index: number) {
    const target: Kind = kind === "primary" ? "footer" : "primary";
    setNavigation((current) => {
      const link = current[kind][index];
      if (!link) return current;
      return {
        ...current,
        [kind]: current[kind].filter((_, position) => position !== index),
        [target]: [...current[target], link],
      };
    });
  }

  function addCustom(kind: Kind) {
    setNavigation((current) => ({
      ...current,
      [kind]: [...current[kind], { label: "New link", href: "/" }],
    }));
  }

  function addSelectedPage(kind: Kind) {
    const page = pages.find((item) => item.path === selectedPage);
    if (!page) return;
    if (navigation[kind].some((link) => link.href === page.path)) {
      showToast(`${page.title} is already in this menu.`, false);
      return;
    }
    setNavigation((current) => ({
      ...current,
      [kind]: [...current[kind], { label: page.title, href: page.path }],
    }));
  }

  function addFooterColumn() {
    setNavigation((current) => {
      if (current.footerColumns.length >= 4) return current;
      return {
        ...current,
        footerColumns: [
          ...current.footerColumns,
          { title: `Column ${current.footerColumns.length + 1}`, links: [] },
        ],
      };
    });
  }

  function updateFooterColumn(index: number, patch: Partial<FooterColumn>) {
    setNavigation((current) => ({
      ...current,
      footerColumns: current.footerColumns.map((column, position) =>
        position === index ? { ...column, ...patch } : column,
      ),
    }));
  }

  function moveFooterColumn(index: number, delta: -1 | 1) {
    setNavigation((current) => {
      const columns = [...current.footerColumns];
      const target = index + delta;
      if (target < 0 || target >= columns.length) return current;
      [columns[index], columns[target]] = [columns[target]!, columns[index]!];
      return { ...current, footerColumns: columns };
    });
  }

  function removeFooterColumn(index: number) {
    setNavigation((current) => ({
      ...current,
      footerColumns: current.footerColumns.filter((_, position) => position !== index),
    }));
  }

  function addFooterColumnLink(columnIndex: number) {
    setNavigation((current) => ({
      ...current,
      footerColumns: current.footerColumns.map((column, position) =>
        position === columnIndex && column.links.length < 20
          ? { ...column, links: [...column.links, { label: "New link", href: "/" }] }
          : column,
      ),
    }));
  }

  function updateFooterColumnLink(columnIndex: number, linkIndex: number, patch: Partial<Link>) {
    setNavigation((current) => ({
      ...current,
      footerColumns: current.footerColumns.map((column, position) =>
        position === columnIndex
          ? {
              ...column,
              links: column.links.map((link, itemPosition) =>
                itemPosition === linkIndex ? { ...link, ...patch } : link,
              ),
            }
          : column,
      ),
    }));
  }

  function removeFooterColumnLink(columnIndex: number, linkIndex: number) {
    setNavigation((current) => ({
      ...current,
      footerColumns: current.footerColumns.map((column, position) =>
        position === columnIndex
          ? { ...column, links: column.links.filter((_, itemPosition) => itemPosition !== linkIndex) }
          : column,
      ),
    }));
  }

  function setCta(patch: Partial<Link>) {
    setNavigation((current) => ({
      ...current,
      cta: { label: current.cta?.label ?? "", href: current.cta?.href ?? "/", ...patch },
    }));
  }

  function clearCta() {
    setNavigation((current) => {
      const next = { ...current };
      delete next.cta;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navigation }),
    });
    const data = await res.json().catch(() => ({})) as {
      navigation?: Navigation; warnings?: string[]; error?: string;
    };
    setSaving(false);
    if (!res.ok) {
      showToast(data.error ?? "Could not save navigation.", false);
      return;
    }
    const saved = data.navigation ?? navigation;
    setNavigation(saved);
    setInitial(JSON.stringify(saved));
    setWarnings(data.warnings ?? []);
    showToast("Navigation saved and published.", true);
  }

  return (
    <>
      <div className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Site structure</span>
          <h1 className="sa-h1">Navigation</h1>
          <p className="sa-subtitle">Control the header, footer and primary call-to-action without editing page content.</p>
        </div>
        {dirty || saving ? (
          <button className="sa-btn sa-btn--primary" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save navigation"}
          </button>
        ) : (
          <span className={styles.saved}>Saved</span>
        )}
      </div>

      {warnings.length ? (
        <section className={styles.warnings}>
          <strong>{warnings.length} navigation warning{warnings.length === 1 ? "" : "s"}</strong>
          {warnings.map((warning) => <span key={warning}>{warning}</span>)}
        </section>
      ) : null}

      <section className={`sa-card ${styles.addPage}`}>
        <div>
          <span className="sa-card__eyebrow">Add existing page</span>
          <h2>Publish a page in a menu</h2>
        </div>
        <select value={selectedPage} onChange={(event) => setSelectedPage(event.target.value)}>
          {pages.map((page) => <option value={page.path} key={page.path}>{page.title} · {page.path}</option>)}
        </select>
        <button className="sa-btn sa-btn--ghost" onClick={() => addSelectedPage("primary")}>Add to header</button>
        <button className="sa-btn sa-btn--ghost" onClick={() => addSelectedPage("footer")}>Add to footer</button>
      </section>

      <div className={styles.columns}>
        <MenuEditor
          title="Header navigation"
          kind="primary"
          rows={navigation.primary}
          onUpdate={update}
          onMove={move}
          onRemove={remove}
          onMoveAcross={moveAcross}
          onAdd={() => addCustom("primary")}
        />
        <MenuEditor
          title="Footer navigation"
          kind="footer"
          rows={navigation.footer}
          onUpdate={update}
          onMove={move}
          onRemove={remove}
          onMoveAcross={moveAcross}
          onAdd={() => addCustom("footer")}
        />
      </div>

      <FooterColumnsEditor
        columns={navigation.footerColumns}
        onAdd={addFooterColumn}
        onUpdate={updateFooterColumn}
        onMove={moveFooterColumn}
        onRemove={removeFooterColumn}
        onAddLink={addFooterColumnLink}
        onUpdateLink={updateFooterColumnLink}
        onRemoveLink={removeFooterColumnLink}
      />

      <section className={`sa-card ${styles.cta}`}>
        <div className={styles.sectionHead}>
          <div><span className="sa-card__eyebrow">Primary CTA</span><h2>Header action</h2></div>
          {navigation.cta ? <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={clearCta}>Remove CTA</button> : null}
        </div>
        {navigation.cta ? (
          <div className={styles.linkFields}>
            <input value={navigation.cta.label} onChange={(event) => setCta({ label: event.target.value })} placeholder="Contact us" />
            <input value={navigation.cta.href} onChange={(event) => setCta({ href: event.target.value })} placeholder="/contact" />
          </div>
        ) : (
          <button className="sa-btn sa-btn--ghost" onClick={() => setNavigation((current) => ({ ...current, cta: { label: "Contact us", href: "/contact" } }))}>
            Add CTA
          </button>
        )}
      </section>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}

function FooterColumnsEditor({
  columns,
  onAdd,
  onUpdate,
  onMove,
  onRemove,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
}: {
  columns: FooterColumn[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<FooterColumn>) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAddLink: (columnIndex: number) => void;
  onUpdateLink: (columnIndex: number, linkIndex: number, patch: Partial<Link>) => void;
  onRemoveLink: (columnIndex: number, linkIndex: number) => void;
}) {
  return (
    <section className={`sa-card ${styles.footerColumns}`}>
      <div className={styles.sectionHead}>
        <div>
          <span className="sa-card__eyebrow">Global footer</span>
          <h2>Footer columns</h2>
        </div>
        <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={onAdd} disabled={columns.length >= 4}>
          + Add column
        </button>
      </div>

      <p className={styles.footerColumnsIntro}>
        These columns are shown inside the real footer on every page. The legacy Footer navigation above is used as fallback when no columns exist.
      </p>

      {columns.length ? (
        <div className={styles.footerColumnsGrid}>
          {columns.map((column, columnIndex) => (
            <article className={styles.footerColumn} key={`footer-column-${columnIndex}`}>
              <div className={styles.footerColumnHead}>
                <input
                  className={styles.footerColumnTitle}
                  value={column.title}
                  onChange={(event) => onUpdate(columnIndex, { title: event.target.value })}
                  aria-label={`Footer column ${columnIndex + 1} title`}
                />
                <div className={styles.footerColumnActions}>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onMove(columnIndex, -1)} disabled={columnIndex === 0}>↑</button>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onMove(columnIndex, 1)} disabled={columnIndex === columns.length - 1}>↓</button>
                  <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => onRemove(columnIndex)}>Remove</button>
                </div>
              </div>

              <div className={styles.footerColumnLinks}>
                {column.links.map((link, linkIndex) => (
                  <div className={styles.footerColumnLink} key={`footer-column-${columnIndex}-link-${linkIndex}`}>
                    <input
                      value={link.label}
                      onChange={(event) => onUpdateLink(columnIndex, linkIndex, { label: event.target.value })}
                      placeholder="Label"
                      aria-label="Footer link label"
                    />
                    <input
                      value={link.href}
                      onChange={(event) => onUpdateLink(columnIndex, linkIndex, { href: event.target.value })}
                      placeholder="/page"
                      aria-label="Footer link URL"
                    />
                    <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => onRemoveLink(columnIndex, linkIndex)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                className={`sa-btn sa-btn--ghost sa-btn--sm ${styles.addFooterLink}`}
                onClick={() => onAddLink(columnIndex)}
                disabled={column.links.length >= 20}
              >
                + Add link
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="sa-empty">
          <div className="sa-empty__title">No footer columns yet</div>
          <div className="sa-empty__desc">Add columns for groups such as Services, Company and Social media.</div>
        </div>
      )}
    </section>
  );
}

function MenuEditor({
  title, kind, rows, onUpdate, onMove, onRemove, onMoveAcross, onAdd,
}: {
  title: string;
  kind: Kind;
  rows: Link[];
  onUpdate: (kind: Kind, index: number, patch: Partial<Link>) => void;
  onMove: (kind: Kind, index: number, delta: -1 | 1) => void;
  onRemove: (kind: Kind, index: number) => void;
  onMoveAcross: (kind: Kind, index: number) => void;
  onAdd: () => void;
}) {
  return (
    <section className={`sa-card ${styles.menu}`}>
      <div className={styles.sectionHead}>
        <div><span className="sa-card__eyebrow">Menu</span><h2>{title}</h2></div>
        <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={onAdd}>+ Custom link</button>
      </div>

      {rows.length ? (
        <div className={styles.rows}>
          {rows.map((link, index) => (
            <div className={styles.row} key={`${kind}-${index}`}>
              <span className={styles.position}>{index + 1}</span>
              <div className={styles.linkFields}>
                <input value={link.label} onChange={(event) => onUpdate(kind, index, { label: event.target.value })} aria-label="Link label" />
                <input value={link.href} onChange={(event) => onUpdate(kind, index, { href: event.target.value })} aria-label="Link URL" />
              </div>
              <div className={styles.actions}>
                <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onMove(kind, index, -1)} disabled={index === 0}>↑</button>
                <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onMove(kind, index, 1)} disabled={index === rows.length - 1}>↓</button>
                <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onMoveAcross(kind, index)}>{kind === "primary" ? "→ Footer" : "→ Header"}</button>
                <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => onRemove(kind, index)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="sa-empty"><div className="sa-empty__title">Menu is empty</div><div className="sa-empty__desc">Add an existing page or create a custom link.</div></div>}
    </section>
  );
}
