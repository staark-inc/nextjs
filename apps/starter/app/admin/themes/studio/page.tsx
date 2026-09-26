"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BuiltInTheme = {
  id: string;
  name: string;
  description: string;
  presets: string[];
  active: boolean;
};

type CustomTheme = {
  id: string;
  name: string;
  description: string;
  baseTheme: string;
  basePreset: string;
  createdAt: string;
  updatedAt: string;
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export default function ThemeStudioPage() {
  const router = useRouter();
  const [builtIns, setBuiltIns] = useState<BuiltInTheme[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [baseTheme, setBaseTheme] = useState("");
  const [basePreset, setBasePreset] = useState("");
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState("");
  const [appliedId, setAppliedId] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [importCandidate, setImportCandidate] = useState<Record<string, unknown> | null>(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    const [builtInRes, customRes] = await Promise.all([
      fetch("/api/admin/themes"),
      fetch("/api/admin/themes/studio"),
    ]);
    const builtInData = await builtInRes.json();
    const customData = await customRes.json();
    setBuiltIns(builtInData.themes ?? []);
    if (!baseTheme) {
      setBaseTheme(builtInData.active ?? builtInData.themes?.[0]?.id ?? "light");
    }
    setCustomThemes(customData.themes ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedBase = useMemo(
    () => builtIns.find((theme) => theme.id === baseTheme),
    [builtIns, baseTheme],
  );

  useEffect(() => {
    if (!selectedBase) return;
    if (!selectedBase.presets.includes(basePreset)) {
      setBasePreset(selectedBase.presets[0] ?? "");
    }
  }, [selectedBase, basePreset]);

  async function createTheme(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !basePreset) return;
    setCreating(true);

    const res = await fetch("/api/admin/themes/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        id: id.trim() || slugify(name),
        baseTheme,
        basePreset,
        clonePreset: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not create theme.", false);
      return;
    }

    const themeId = (data as { theme?: { id?: string } }).theme?.id;
    if (themeId) router.push(`/admin/themes/studio/${themeId}`);
  }

  async function applyTheme(theme: CustomTheme) {
    setApplying(theme.id);
    const res = await fetch(`/api/admin/themes/studio/${theme.id}/apply`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setApplying("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not apply theme.", false);
      return;
    }

    const result = data as { activeBaseTheme?: string; crossFamily?: boolean };
    setAppliedId(theme.id);
    showToast(
      result.crossFamily
        ? `Applied "${theme.name}" as a design layer on ${result.activeBaseTheme ?? "the active"} family.`
        : `Applied "${theme.name}". Changes are live now.`,
      true,
    );
  }


  async function pickImport(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      if (raw.schema !== "staark-theme/v1" || raw.version !== 1) {
        throw new Error("This is not a Staark Theme v1 document.");
      }
      setImportCandidate(raw);
    } catch (error) {
      setImportCandidate(null);
      showToast((error as Error).message || "Invalid theme file.", false);
    }
  }

  async function installImport() {
    if (!importCandidate) return;
    setImporting(true);
    const res = await fetch("/api/admin/themes/studio/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: importCandidate, onConflict: "copy" }),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not import theme.", false);
      return;
    }

    setImportCandidate(null);
    showToast("Theme imported.", true);
    await load();
  }

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <a href="/admin/themes">Themes</a>
        <span>/</span>
        <span>Theme Studio</span>
      </div>

      <section className="ts-page-head">
        <div>
          <span className="sa-page-eyebrow">Theme Studio</span>
          <h1 className="sa-h1">Create your own design system.</h1>
          <p className="sa-subtitle">
            Custom themes inherit safe React components from a built-in theme and store only design tokens and component variants.
          </p>
        </div>
        <div className="ts-page-actions">
          <input
            ref={importRef}
            type="file"
            accept=".json,.staark-theme.json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void pickImport(file);
              event.currentTarget.value = "";
            }}
          />
          <a className="sa-btn sa-btn--primary" href="/admin/themes/studio/brand">Create from brand</a>
          <button className="sa-btn sa-btn--ghost" onClick={() => importRef.current?.click()}>Upload theme</button>
          <a className="sa-btn sa-btn--ghost" href="/admin/themes">Back to Themes</a>
        </div>
      </section>

      {importCandidate ? (
        <section className="ts-import-card">
          <div>
            <span className="sa-page-eyebrow">Import preview</span>
            <h2>{String(importCandidate.name ?? "Unnamed theme")}</h2>
            <p>
              {String(importCandidate.id ?? "unknown")} · {String(importCandidate.baseTheme ?? "unknown")} /
              {" "}{String(importCandidate.basePreset ?? "unknown")}
            </p>
          </div>
          <div className="ts-import-card__actions">
            <button className="sa-btn sa-btn--ghost" onClick={() => setImportCandidate(null)}>Cancel</button>
            <button className="sa-btn sa-btn--primary" onClick={() => void installImport()} disabled={importing}>
              {importing ? "Importing…" : "Install theme"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="ts-grid">
        <section className="sa-card ts-create">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">New custom theme</span>
              <h2>Start from a proven base</h2>
            </div>
          </div>

          <form onSubmit={createTheme} className="ts-create__form">
            <div className="sa-field">
              <label htmlFor="ts-name">Theme name</label>
              <input
                id="ts-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!id) setId(slugify(event.target.value));
                }}
                placeholder="Nordic Studio"
                required
              />
            </div>

            <div className="sa-field">
              <label htmlFor="ts-id">Theme id</label>
              <input
                id="ts-id"
                value={id}
                onChange={(event) => setId(slugify(event.target.value))}
                placeholder="nordic-studio"
                required
              />
              <div className="sa-field-hint">Stored locally as a Staark Theme Studio document.</div>
            </div>

            <div className="ts-form-row">
              <div className="sa-field">
                <label htmlFor="ts-base">Base theme</label>
                <select id="ts-base" value={baseTheme} onChange={(event) => setBaseTheme(event.target.value)}>
                  {builtIns.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </select>
              </div>

              <div className="sa-field">
                <label htmlFor="ts-preset">Starting preset</label>
                <select id="ts-preset" value={basePreset} onChange={(event) => setBasePreset(event.target.value)}>
                  {(selectedBase?.presets ?? []).map((preset) => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="sa-btn sa-btn--primary" disabled={creating || !basePreset}>
              {creating ? "Creating…" : "Create and edit"}
            </button>
          </form>
        </section>

        <aside className="ts-explainer">
          <span className="ts-explainer__badge">Safe by design</span>
          <h2>No uploaded JavaScript.</h2>
          <p>
            A custom theme stores colors, typography, layout and component variants. The executable React components stay in Staark.
          </p>
          <div className="ts-layer-stack">
            <span>Built-in React theme</span>
            <strong>+</strong>
            <span>Custom design document</span>
            <strong>=</strong>
            <span>Client theme</span>
          </div>
        </aside>
      </div>

      <section className="ts-library">
        <div className="ts-library__head">
          <div>
            <span className="sa-page-eyebrow">Library</span>
            <h2>Your custom themes</h2>
          </div>
          <span className="sa-badge sa-badge--muted">{customThemes.length} theme(s)</span>
        </div>

        {customThemes.length ? (
          <div className="ts-theme-grid">
            {customThemes.map((theme) => (
              <article className="ts-theme-card" key={theme.id}>
                <div className="ts-theme-card__preview" data-base={theme.baseTheme}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="ts-theme-card__body">
                  <div className="ts-theme-card__title">
                    <div>
                      <h3>{theme.name}</h3>
                      <small>{theme.id}</small>
                    </div>
                    <span className="sa-badge sa-badge--muted">Custom</span>
                  </div>
                  <p>{theme.description || `Based on ${theme.baseTheme} / ${theme.basePreset}`}</p>
                  <div className="ts-theme-card__meta">
                    <span>{theme.baseTheme}</span>
                    <span>{theme.basePreset}</span>
                  </div>
                  <div className="ts-theme-card__actions">
                    <a className="sa-btn sa-btn--ghost sa-btn--sm" href={`/admin/themes/studio/${theme.id}`}>
                      Edit
                    </a>
                    <a className="sa-btn sa-btn--ghost sa-btn--sm" href={`/api/admin/themes/studio/${theme.id}/export`}>
                      Export
                    </a>
                    <a className="sa-btn sa-btn--ghost sa-btn--sm" href="/" target="_blank" rel="noopener noreferrer">
                      View site
                    </a>
                    <button
                      className="sa-btn sa-btn--primary sa-btn--sm"
                      onClick={() => void applyTheme(theme)}
                      disabled={Boolean(applying)}
                    >
                      {applying === theme.id ? "Applying…" : appliedId === theme.id ? "Applied ✓" : "Apply"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sa-card">
            <div className="sa-empty">
              <div className="sa-empty__title">No custom themes yet</div>
              <div className="sa-empty__desc">Create one above. Your built-in themes remain untouched.</div>
            </div>
          </div>
        )}
      </section>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
