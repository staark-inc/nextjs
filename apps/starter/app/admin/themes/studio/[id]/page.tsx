"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TokenGroup = "colors" | "typography" | "radius" | "layout";
type ThemeTokens = Partial<Record<TokenGroup, Record<string, string>>>;

type StudioTheme = {
  schema: "staark-theme/v1";
  version: 1;
  id: string;
  name: string;
  description: string;
  baseTheme: "light" | "salong" | "gastfrihet";
  basePreset: string;
  tokens: ThemeTokens;
  components: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

type BasePreset = {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
  components: Record<string, string>;
};

type EditorTab = "colors" | "typography" | "shape" | "layout" | "components";
type Device = "desktop" | "tablet" | "mobile";

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "shape", label: "Shape" },
  { id: "layout", label: "Layout" },
  { id: "components", label: "Components" },
];

const ORDER: Record<TokenGroup, string[]> = {
  colors: ["primary", "primaryDark", "primarySoft", "ink", "muted", "paper", "surface", "white", "line", "success", "gold"],
  typography: ["body", "display", "displayWeight"],
  radius: ["sm", "md", "lg", "button"],
  layout: ["content", "wide", "wrap"],
};

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function colorInput(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

function keysFor(group: TokenGroup, theme: StudioTheme, base: BasePreset | null) {
  const keys = new Set([
    ...Object.keys(base?.tokens[group] ?? {}),
    ...Object.keys(theme.tokens[group] ?? {}),
  ]);
  const preferred = ORDER[group].filter((key) => keys.has(key));
  return [...preferred, ...[...keys].filter((key) => !preferred.includes(key)).sort()];
}

export default function ThemeStudioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [theme, setTheme] = useState<StudioTheme | null>(null);
  const [basePreset, setBasePreset] = useState<BasePreset | null>(null);
  const [initial, setInitial] = useState("");
  const [tab, setTab] = useState<EditorTab>("colors");
  const [device, setDevice] = useState<Device>("desktop");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch(`/api/admin/themes/studio/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Theme not found.");
        return res.json();
      })
      .then((data: { theme: StudioTheme; basePreset: BasePreset }) => {
        setTheme(data.theme);
        setBasePreset(data.basePreset);
        setInitial(JSON.stringify(data.theme));
      })
      .catch((error) => showToast((error as Error).message, false));
  }, [id]);

  const dirty = theme ? JSON.stringify(theme) !== initial : false;

  function setToken(group: TokenGroup, key: string, value: string) {
    setTheme((current) => {
      if (!current) return current;
      return {
        ...current,
        tokens: {
          ...current.tokens,
          [group]: { ...(current.tokens[group] ?? {}), [key]: value },
        },
      };
    });
  }

  function setComponent(key: string, value: string) {
    setTheme((current) => current ? {
      ...current,
      components: { ...current.components, [key]: value },
    } : current);
  }

  function resetSection(section: EditorTab) {
    if (!theme || !basePreset) return;
    if (section === "components") {
      setTheme({ ...theme, components: { ...basePreset.components } });
      return;
    }
    const group: TokenGroup = section === "shape" ? "radius" : section;
    setTheme({
      ...theme,
      tokens: { ...theme.tokens, [group]: { ...(basePreset.tokens[group] ?? {}) } },
    });
  }

  async function save() {
    if (!theme) return;
    setSaving(true);
    const res = await fetch(`/api/admin/themes/studio/${theme.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: theme.name,
        description: theme.description,
        baseTheme: theme.baseTheme,
        basePreset: theme.basePreset,
        tokens: theme.tokens,
        components: theme.components,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not save theme.", false);
      return;
    }

    const saved = (data as { theme: StudioTheme }).theme;
    setTheme(saved);
    setInitial(JSON.stringify(saved));
    showToast("Theme draft saved.", true);
  }

  async function apply() {
    if (!theme) return;
    if (dirty) await save();
    setApplying(true);
    const res = await fetch(`/api/admin/themes/studio/${theme.id}/apply`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setApplying(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not apply theme.", false);
      return;
    }
    const result = data as { activeBaseTheme?: string; crossFamily?: boolean };
    showToast(
      result.crossFamily
        ? `Theme applied as a design layer on ${result.activeBaseTheme ?? "the active"} family.`
        : "Theme applied. Changes are live now.",
      true,
    );
  }

  async function duplicate() {
    if (!theme) return;
    const res = await fetch("/api/admin/themes/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${theme.name} Copy`,
        id: `${theme.id}-copy`,
        description: theme.description,
        baseTheme: theme.baseTheme,
        basePreset: theme.basePreset,
        clonePreset: false,
        tokens: theme.tokens,
        components: theme.components,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not duplicate theme.", false);
      return;
    }
    router.push(`/admin/themes/studio/${(data as { theme: StudioTheme }).theme.id}`);
  }

  async function remove() {
    if (!theme || !confirm(`Delete "${theme.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/themes/studio/${theme.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/themes/studio");
    else showToast("Could not delete theme.", false);
  }

  const colors = theme?.tokens.colors ?? {};
  const typography = theme?.tokens.typography ?? {};
  const radius = theme?.tokens.radius ?? {};
  const primary = colors.primary ?? "#2563eb";
  const ink = colors.ink ?? "#0f172a";
  const muted = colors.muted ?? "#64748b";
  const paper = colors.paper ?? "#ffffff";
  const surface = colors.surface ?? "#f8fafc";
  const line = colors.line ?? "#e2e8f0";
  const displayFont = typography.display ?? typography.body ?? "ui-sans-serif, system-ui";
  const bodyFont = typography.body ?? "ui-sans-serif, system-ui";

  const previewStyle = useMemo(() => ({
    "--ts-primary": primary,
    "--ts-ink": ink,
    "--ts-muted": muted,
    "--ts-paper": paper,
    "--ts-surface": surface,
    "--ts-line": line,
    "--ts-radius": radius.md ?? "16px",
    "--ts-radius-button": radius.button ?? radius.sm ?? "10px",
    "--ts-font-body": bodyFont,
    "--ts-font-display": displayFont,
  }) as React.CSSProperties, [primary, ink, muted, paper, surface, line, radius, bodyFont, displayFont]);

  if (!theme) {
    return <div className="sa-card"><p className="sa-empty__desc">Loading Theme Studio…</p></div>;
  }

  const tokenGroup: TokenGroup = tab === "shape" ? "radius" : tab === "components" ? "colors" : tab;
  const tokenKeys = tab === "components" ? [] : keysFor(tokenGroup, theme, basePreset);

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <a href="/admin/themes">Themes</a>
        <span>/</span>
        <a href="/admin/themes/studio">Theme Studio</a>
        <span>/</span>
        <span>{theme.name}</span>
      </div>

      <header className="ts-editor-head">
        <div>
          <span className="sa-page-eyebrow">{theme.baseTheme} / {theme.basePreset}</span>
          <div className="ts-editor-title">
            <input
              value={theme.name}
              onChange={(event) => setTheme({ ...theme, name: event.target.value })}
              aria-label="Theme name"
            />
            {dirty ? <span className="ts-unsaved">Unsaved</span> : <span className="ts-saved">Saved</span>}
          </div>
          <input
            className="ts-description-input"
            value={theme.description}
            onChange={(event) => setTheme({ ...theme, description: event.target.value })}
            placeholder="Describe this design…"
            aria-label="Theme description"
          />
        </div>
        <div className="ts-editor-actions">
          <button className="sa-btn sa-btn--ghost" onClick={() => void duplicate()}>Duplicate</button>
          <button className="sa-btn sa-btn--ghost" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="sa-btn sa-btn--primary" onClick={() => void apply()} disabled={applying}>
            {applying ? "Applying…" : "Apply to site"}
          </button>
        </div>
      </header>

      <div className="ts-editor">
        <aside className="ts-controls">
          <div className="ts-tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "is-active" : ""}
                onClick={() => setTab(item.id)}
                role="tab"
                aria-selected={tab === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="ts-controls__section-head">
            <div>
              <span>Editing</span>
              <strong>{TABS.find((item) => item.id === tab)?.label}</strong>
            </div>
            <button onClick={() => resetSection(tab)}>Reset section</button>
          </div>

          {tab === "colors" ? (
            <div className="ts-control-list">
              {tokenKeys.map((key) => {
                const value = theme.tokens.colors?.[key] ?? "";
                return (
                  <label className="ts-color-control" key={key}>
                    <span>{humanize(key)}</span>
                    <div>
                      <input
                        type="color"
                        value={colorInput(value)}
                        onChange={(event) => setToken("colors", key, event.target.value.toUpperCase())}
                      />
                      <input value={value} onChange={(event) => setToken("colors", key, event.target.value)} />
                    </div>
                  </label>
                );
              })}
            </div>
          ) : null}

          {tab !== "colors" && tab !== "components" ? (
            <div className="ts-control-list">
              {tokenKeys.map((key) => (
                <label className="sa-field" key={key}>
                  <span>{humanize(key)}</span>
                  <input
                    value={theme.tokens[tokenGroup]?.[key] ?? ""}
                    onChange={(event) => setToken(tokenGroup, key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {tab === "components" ? (
            <div className="ts-control-list">
              {Object.keys({ ...(basePreset?.components ?? {}), ...theme.components }).sort().map((key) => (
                <label className="sa-field" key={key}>
                  <span>{humanize(key)}</span>
                  <input value={theme.components[key] ?? ""} onChange={(event) => setComponent(key, event.target.value)} />
                  <small>Base: {basePreset?.components[key] ?? "—"}</small>
                </label>
              ))}
            </div>
          ) : null}

          <div className="ts-danger-zone">
            <button onClick={() => void remove()}>Delete custom theme</button>
          </div>
        </aside>

        <section className="ts-preview-area">
          <div className="ts-preview-toolbar">
            <div>
              <strong>Live preview</strong>
              <span>Updates while you edit</span>
            </div>
            <div className="ts-device-switcher">
              {(["desktop", "tablet", "mobile"] as Device[]).map((item) => (
                <button key={item} className={device === item ? "is-active" : ""} onClick={() => setDevice(item)}>
                  {humanize(item)}
                </button>
              ))}
            </div>
          </div>

          <div className={`ts-device ts-device--${device}`}>
            <div className="ts-mini-site" style={previewStyle}>
              <header className="ts-mini-nav">
                <strong>{theme.name}</strong>
                <nav><span>Services</span><span>About</span><span>Contact</span></nav>
                <button>Book now</button>
              </header>
              <section className="ts-mini-hero">
                <span className="ts-mini-eyebrow">Theme Studio preview</span>
                <h2>A website that feels unmistakably yours.</h2>
                <p>Colors, typography, spacing and component choices update here before you apply them to the live site.</p>
                <div><button>Primary action</button><button className="is-secondary">Learn more</button></div>
              </section>
              <section className="ts-mini-section">
                <div className="ts-mini-section__head">
                  <span>What we do</span>
                  <h3>Designed around your brand.</h3>
                </div>
                <div className="ts-mini-cards">
                  {["Strategy", "Design", "Delivery"].map((item) => (
                    <article key={item}>
                      <span>0{item === "Strategy" ? "1" : item === "Design" ? "2" : "3"}</span>
                      <h4>{item}</h4>
                      <p>Clear hierarchy, useful content and a visual system that stays consistent.</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
