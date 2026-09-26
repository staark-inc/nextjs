"use client";

import { useEffect, useMemo, useState } from "react";

type ThemeInfo = {
  id: string;
  name: string;
  description: string;
  presets: string[];
  active: boolean;
};

type TokenGroup = "colors" | "typography" | "radius" | "layout";
type ThemeTokens = Partial<Record<TokenGroup, Record<string, string>>>;
type ThemePreset = {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
  components: Record<string, string>;
};
type ThemeConfig = {
  theme: string;
  preset?: string;
  presets: ThemePreset[];
  overrides: ThemeTokens;
  components: Record<string, string>;
};

type EditorSection = "colors" | "typography" | "shape" | "layout" | "components";

const SECTION_LABELS: Array<{ id: EditorSection; label: string }> = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "shape", label: "Shape" },
  { id: "layout", label: "Layout" },
  { id: "components", label: "Components" },
];

const COLOR_ORDER = ["primary", "primaryDark", "primarySoft", "ink", "muted", "paper", "surface", "white", "line", "success", "forest", "forestDeep", "gold"];
const TYPOGRAPHY_ORDER = ["body", "display", "displayWeight"];
const RADIUS_ORDER = ["sm", "md", "lg", "button"];
const LAYOUT_ORDER = ["content", "wide", "wrap"];
const COMPONENT_ORDER = ["header", "buttons", "cards", "hero", "footer"];

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function orderedKeys(record: Record<string, string> | undefined, preferred: string[]): string[] {
  const keys = Object.keys(record ?? {});
  return [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key)).sort()];
}

function colorValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [active, setActive] = useState("");
  const [config, setConfig] = useState<ThemeConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [overrides, setOverrides] = useState<ThemeTokens>({});
  const [components, setComponents] = useState<Record<string, string>>({});
  const [section, setSection] = useState<EditorSection>("colors");
  const [switching, setSwitching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    const [themesRes, configRes] = await Promise.all([
      fetch("/api/admin/themes"),
      fetch("/api/admin/themes/config"),
    ]);
    const themesData = await themesRes.json();
    const configData = configRes.ok ? ((await configRes.json()) as ThemeConfig) : null;
    setThemes(themesData.themes ?? []);
    setActive(themesData.active ?? "");
    if (configData) {
      setConfig(configData);
      setSelectedPreset(configData.preset ?? configData.presets[0]?.id ?? "");
      setOverrides(configData.overrides ?? {});
      setComponents(configData.components ?? {});
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const preset = useMemo(
    () => config?.presets.find((item) => item.id === selectedPreset) ?? config?.presets[0] ?? null,
    [config, selectedPreset],
  );

  function effective(group: TokenGroup, key: string): string {
    return overrides[group]?.[key] ?? preset?.tokens[group]?.[key] ?? "";
  }

  function setOverride(group: TokenGroup, key: string, value: string) {
    const base = preset?.tokens[group]?.[key] ?? "";
    setOverrides((current) => {
      const nextGroup = { ...(current[group] ?? {}) };
      if (!value.trim() || value.trim() === base) delete nextGroup[key];
      else nextGroup[key] = value;

      const next = { ...current };
      if (Object.keys(nextGroup).length) next[group] = nextGroup;
      else delete next[group];
      return next;
    });
  }

  function componentValue(key: string): string {
    return components[key] ?? preset?.components[key] ?? "";
  }

  function setComponent(key: string, value: string) {
    const base = preset?.components[key] ?? "";
    setComponents((current) => {
      const next = { ...current };
      if (!value.trim() || value.trim() === base) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function activate(themeId: string, presetId?: string) {
    setSwitching(true);
    const res = await fetch("/api/admin/themes/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId, preset: presetId }),
    });
    setSwitching(false);
    if (res.ok) {
      showToast(`Theme "${themeId}" activated. Reloading the editor…`, true);
      setTimeout(() => window.location.reload(), 900);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast((data as { error?: string }).error ?? "Failed to switch theme.", false);
    }
  }

  async function save() {
    if (!selectedPreset) return;
    setSaving(true);
    const res = await fetch("/api/admin/themes/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: selectedPreset, overrides, components }),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Theme settings saved. Refresh the website to see the changes.", true);
      const data = (await res.json()) as { overrides?: ThemeTokens; components?: Record<string, string> };
      setOverrides(data.overrides ?? {});
      setComponents(data.components ?? {});
    } else {
      const data = await res.json().catch(() => ({}));
      showToast((data as { error?: string }).error ?? "Failed to save theme settings.", false);
    }
  }

  function resetCustomizations() {
    setOverrides({});
    setComponents({});
    showToast("Custom values cleared locally. Save to use the preset defaults.", true);
  }

  const activeTheme = themes.find((item) => item.id === active);
  const tokenKeys = (group: TokenGroup, preferred: string[]) =>
    orderedKeys({ ...(preset?.tokens[group] ?? {}), ...(overrides[group] ?? {}) }, preferred);
  const componentKeys = orderedKeys({ ...(preset?.components ?? {}), ...components }, COMPONENT_ORDER);
  const customCount =
    Object.keys(overrides.colors ?? {}).length +
    Object.keys(overrides.typography ?? {}).length +
    Object.keys(overrides.radius ?? {}).length +
    Object.keys(overrides.layout ?? {}).length +
    Object.keys(components).length;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>Themes</span>
      </div>

      <h1 className="sa-h1">Themes</h1>
      <p className="sa-subtitle">Choose the design foundation, then customize the active site without editing theme files.</p>

      <div className="sa-theme-grid sa-theme-grid--compact">
        {themes.map((theme) => (
          <article key={theme.id} className={`sa-theme-card${theme.active ? " sa-theme-card--active" : ""}`}>
            <div className="sa-theme-card__header">
              <div>
                <h3>{theme.name}</h3>
                <span className="sa-path">{theme.id}</span>
              </div>
              {theme.active ? <span className="sa-badge sa-badge--success">Active</span> : null}
            </div>
            <p className="sa-theme-card__desc">{theme.description}</p>
            <div className="sa-theme-card__presets">
              <span className="sa-theme-card__presets-label">Presets</span>
              {theme.presets.map((item) => (
                <span key={item} className="sa-badge sa-badge--muted">{item}</span>
              ))}
            </div>
            {!theme.active ? (
              <button
                className="sa-btn sa-btn--primary sa-btn--sm"
                onClick={() => void activate(theme.id, theme.presets[0])}
                disabled={switching}
              >
                {switching ? "Activating…" : "Activate theme"}
              </button>
            ) : null}
          </article>
        ))}
      </div>

      {config && preset ? (
        <section className="sa-theme-editor">
          <div className="sa-theme-editor__head">
            <div>
              <p className="sa-kicker">Active design</p>
              <h2>{activeTheme?.name ?? config.theme}</h2>
              <p>Preset values stay untouched. Everything below is saved as site-specific overrides.</p>
            </div>
            <div className="sa-theme-editor__actions">
              <button className="sa-btn sa-btn--ghost" onClick={resetCustomizations} disabled={saving}>Reset customizations</button>
              <button className="sa-btn sa-btn--primary" onClick={() => void save()} disabled={saving || !selectedPreset}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>

          <div className="sa-theme-editor__preset">
            <div className="sa-field">
              <label htmlFor="theme-preset">Preset</label>
              <select id="theme-preset" value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}>
                {config.presets.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <div className="sa-field-hint">{preset.description || `Base preset: ${preset.id}`}</div>
            </div>
            <div className="sa-theme-preview-strip" aria-label="Current theme colors">
              {["paper", "surface", "primary", "ink"].map((key) => {
                const value = effective("colors", key);
                return (
                  <div key={key}>
                    <span style={{ background: colorValue(value) }} />
                    <small>{humanize(key)}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sa-theme-editor__tabs" role="tablist" aria-label="Theme settings">
            {SECTION_LABELS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={section === item.id}
                className={section === item.id ? "is-active" : ""}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="sa-theme-editor__body">
            {section === "colors" ? (
              <div className="sa-theme-color-grid">
                {tokenKeys("colors", COLOR_ORDER).map((key) => {
                  const value = effective("colors", key);
                  return (
                    <label className="sa-theme-color-field" key={key}>
                      <span className="sa-theme-color-field__label">{humanize(key)}</span>
                      <span className="sa-theme-color-field__control">
                        <input
                          type="color"
                          value={colorValue(value)}
                          onChange={(event) => setOverride("colors", key, event.target.value.toUpperCase())}
                          aria-label={`${humanize(key)} color`}
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(event) => setOverride("colors", key, event.target.value)}
                          spellCheck={false}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {section === "typography" ? (
              <div className="sa-form-grid sa-form-grid--2">
                {tokenKeys("typography", TYPOGRAPHY_ORDER).map((key) => (
                  <div className="sa-field" key={key}>
                    <label htmlFor={`theme-typography-${key}`}>{humanize(key)}</label>
                    <input
                      id={`theme-typography-${key}`}
                      value={effective("typography", key)}
                      onChange={(event) => setOverride("typography", key, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {section === "shape" ? (
              <div className="sa-form-grid sa-form-grid--2">
                {tokenKeys("radius", RADIUS_ORDER).map((key) => (
                  <div className="sa-field" key={key}>
                    <label htmlFor={`theme-radius-${key}`}>{humanize(key)}</label>
                    <input
                      id={`theme-radius-${key}`}
                      value={effective("radius", key)}
                      onChange={(event) => setOverride("radius", key, event.target.value)}
                      placeholder="16px"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {section === "layout" ? (
              <div className="sa-form-grid sa-form-grid--2">
                {tokenKeys("layout", LAYOUT_ORDER).map((key) => (
                  <div className="sa-field" key={key}>
                    <label htmlFor={`theme-layout-${key}`}>{humanize(key)}</label>
                    <input
                      id={`theme-layout-${key}`}
                      value={effective("layout", key)}
                      onChange={(event) => setOverride("layout", key, event.target.value)}
                      placeholder="1320px"
                    />
                    <div className="sa-field-hint">
                      {key === "content" ? "Reading/prose width." : key === "wide" ? "Normal section width." : key === "wrap" ? "Maximum composition width." : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section === "components" ? (
              <div className="sa-form-grid sa-form-grid--2">
                {componentKeys.map((key) => (
                  <div className="sa-field" key={key}>
                    <label htmlFor={`theme-component-${key}`}>{humanize(key)}</label>
                    <input
                      id={`theme-component-${key}`}
                      value={componentValue(key)}
                      onChange={(event) => setComponent(key, event.target.value)}
                    />
                    <div className="sa-field-hint">Preset default: {preset.components[key] ?? "—"}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="sa-theme-editor__footer">
            <span>{customCount} custom value(s)</span>
            <span>Saved to the active site configuration</span>
          </div>
        </section>
      ) : (
        <div className="sa-card"><p className="sa-empty__desc">Loading active theme settings…</p></div>
      )}

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
