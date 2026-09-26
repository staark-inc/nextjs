"use client";

import { useEffect, useState } from "react";

type ThemeInfo = {
  id: string;
  name: string;
  description: string;
  presets: string[];
  active: boolean;
};

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [active, setActive] = useState("");
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    const res = await fetch("/api/admin/themes");
    const data = await res.json();
    setThemes(data.themes);
    setActive(data.active);
  }

  useEffect(() => { load(); }, []);

  async function activate(themeId: string, preset?: string) {
    setSwitching(true);
    const res = await fetch("/api/admin/themes/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId, preset }),
    });
    setSwitching(false);
    if (res.ok) {
      setActive(themeId);
      setThemes((prev) => prev.map((t) => ({ ...t, active: t.id === themeId })));
      showToast(`Switched to "${themeId}"${preset ? ` with preset "${preset}"` : ""}. Dev server restarting…`, true);
    } else {
      showToast("Failed to switch theme.", false);
    }
  }

  return (
    <>
      <h1 className="sa-h1">Themes</h1>
      <p className="sa-subtitle">Switch the active theme and preset. Changes are written to .env.local — the dev server restarts automatically.</p>

      <div className="sa-theme-grid">
        {themes.map((t) => (
          <div key={t.id} className={`sa-theme-card${t.active ? " sa-theme-card--active" : ""}`}>
            <div className="sa-theme-card__header">
              <h3>{t.name}</h3>
              {t.active ? <span className="sa-badge sa-badge--success">Active</span> : null}
            </div>
            <p className="sa-theme-card__desc">{t.description}</p>
            {t.presets.length > 0 ? (
              <div className="sa-theme-card__presets">
                <span className="sa-theme-card__presets-label">Presets:</span>
                {t.presets.map((p) => (
                  <button
                    key={p}
                    className="sa-btn sa-btn--sm sa-btn--ghost"
                    onClick={() => activate(t.id, p)}
                    disabled={switching}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}
            {!t.active ? (
              <button
                className="sa-btn sa-btn--primary sa-btn--sm"
                onClick={() => activate(t.id, t.presets[0])}
                disabled={switching}
                style={{ marginTop: 12 }}
              >
                {switching ? "Switching…" : "Activate"}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
