"use client";

import { useEffect, useState } from "react";

export default function SiteEditor() {
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/site")
      .then((r) => r.json())
      .then((data) => setJson(JSON.stringify(data, null, 2)));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      showToast("Invalid JSON — check the syntax.", false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Settings saved!", true);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast((data as Record<string, string>).error ?? "Failed to save.", false);
    }
  }

  return (
    <>
      <h1 className="sa-h1">Settings</h1>
      <p className="sa-subtitle">site.json — name, contact, navigation, theme config</p>

      <div className="sa-card">
        <div className="sa-field">
          <label htmlFor="site-json">site.json</label>
          <textarea
            id="site-json"
            className="sa-json-editor"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={24}
            spellCheck={false}
          />
          <div className="sa-field-hint">Edit JSON directly. Changes are written to the content directory&apos;s site.json.</div>
        </div>
      </div>

      <div className="sa-toolbar">
        <button className="sa-btn sa-btn--primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
