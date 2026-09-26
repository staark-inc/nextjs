"use client";

import { useEffect, useMemo, useState } from "react";

type NavLink = { label: string; href: string };
type OpeningHour = { days: string; hours: string };
type SiteData = {
  name: string;
  tagline?: string;
  locale?: string;
  url: string;
  theme?: Record<string, unknown>;
  brand?: { copyright?: string; logo?: Record<string, unknown> };
  contact?: {
    email?: string;
    phone?: string;
    address?: { street?: string; postalCode?: string; city?: string; country?: string };
    openingHours?: OpeningHour[];
  };
  navigation?: {
    primary?: NavLink[];
    footer?: NavLink[];
    cta?: NavLink;
  };
  seo?: {
    titleTemplate?: string;
    defaultDescription?: string;
    ogImage?: string;
    businessType?: string;
  };
  [key: string]: unknown;
};

function normalizeSite(raw: SiteData): SiteData {
  return {
    ...raw,
    brand: { ...(raw.brand ?? {}) },
    contact: {
      email: "",
      phone: "",
      ...(raw.contact ?? {}),
      address: { ...(raw.contact?.address ?? {}) },
      openingHours: [...(raw.contact?.openingHours ?? [])],
    },
    navigation: {
      primary: [...(raw.navigation?.primary ?? [])],
      footer: [...(raw.navigation?.footer ?? [])],
      ...(raw.navigation ?? {}),
      cta: raw.navigation?.cta ? { ...raw.navigation.cta } : { label: "", href: "" },
    },
    seo: { ...(raw.seo ?? {}) },
  };
}

export default function SiteEditor() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [advancedJson, setAdvancedJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch("/api/admin/site")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load site settings.");
        return (await r.json()) as SiteData;
      })
      .then((data) => {
        const normalized = normalizeSite(data);
        setSite(normalized);
        setAdvancedJson(JSON.stringify(normalized, null, 2));
      })
      .catch((error: Error) => showToast(error.message, false));
  }, []);

  const primary = site?.navigation?.primary ?? [];
  const footer = site?.navigation?.footer ?? [];
  const openingHours = site?.contact?.openingHours ?? [];

  const previewHost = useMemo(() => {
    if (!site?.url) return "Not configured";
    try {
      return new URL(site.url).host;
    } catch {
      return site.url;
    }
  }, [site?.url]);

  function setContact(patch: Partial<NonNullable<SiteData["contact"]>>) {
    setSite((prev) => prev ? { ...prev, contact: { ...(prev.contact ?? {}), ...patch } } : prev);
  }

  function setAddress(key: "street" | "postalCode" | "city" | "country", value: string) {
    setSite((prev) => prev ? {
      ...prev,
      contact: {
        ...(prev.contact ?? {}),
        address: { ...(prev.contact?.address ?? {}), [key]: value },
      },
    } : prev);
  }

  function setSeo(key: "titleTemplate" | "defaultDescription" | "ogImage" | "businessType", value: string) {
    setSite((prev) => prev ? { ...prev, seo: { ...(prev.seo ?? {}), [key]: value } } : prev);
  }

  function setBrandCopyright(value: string) {
    setSite((prev) => prev ? { ...prev, brand: { ...(prev.brand ?? {}), copyright: value } } : prev);
  }

  function setOpeningHour(index: number, patch: Partial<OpeningHour>) {
    setSite((prev) => {
      if (!prev) return prev;
      const rows = [...(prev.contact?.openingHours ?? [])];
      rows[index] = { ...(rows[index] ?? { days: "", hours: "" }), ...patch };
      return { ...prev, contact: { ...(prev.contact ?? {}), openingHours: rows } };
    });
  }

  function addOpeningHour() {
    setSite((prev) => prev ? {
      ...prev,
      contact: { ...(prev.contact ?? {}), openingHours: [...(prev.contact?.openingHours ?? []), { days: "", hours: "" }] },
    } : prev);
  }

  function removeOpeningHour(index: number) {
    setSite((prev) => prev ? {
      ...prev,
      contact: { ...(prev.contact ?? {}), openingHours: (prev.contact?.openingHours ?? []).filter((_, i) => i !== index) },
    } : prev);
  }

  function updateNav(kind: "primary" | "footer", index: number, patch: Partial<NavLink>) {
    setSite((prev) => {
      if (!prev) return prev;
      const rows = [...(prev.navigation?.[kind] ?? [])];
      rows[index] = { ...(rows[index] ?? { label: "", href: "" }), ...patch };
      return { ...prev, navigation: { ...(prev.navigation ?? {}), [kind]: rows } };
    });
  }

  function addNav(kind: "primary" | "footer") {
    setSite((prev) => prev ? {
      ...prev,
      navigation: { ...(prev.navigation ?? {}), [kind]: [...(prev.navigation?.[kind] ?? []), { label: "", href: "/" }] },
    } : prev);
  }

  function removeNav(kind: "primary" | "footer", index: number) {
    setSite((prev) => prev ? {
      ...prev,
      navigation: { ...(prev.navigation ?? {}), [kind]: (prev.navigation?.[kind] ?? []).filter((_, i) => i !== index) },
    } : prev);
  }

  function moveNav(kind: "primary" | "footer", index: number, delta: -1 | 1) {
    setSite((prev) => {
      if (!prev) return prev;
      const rows = [...(prev.navigation?.[kind] ?? [])];
      const next = index + delta;
      if (next < 0 || next >= rows.length) return prev;
      [rows[index], rows[next]] = [rows[next]!, rows[index]!];
      return { ...prev, navigation: { ...(prev.navigation ?? {}), [kind]: rows } };
    });
  }

  function setCta(key: "label" | "href", value: string) {
    setSite((prev) => prev ? {
      ...prev,
      navigation: {
        ...(prev.navigation ?? {}),
        cta: { label: prev.navigation?.cta?.label ?? "", href: prev.navigation?.cta?.href ?? "", [key]: value },
      },
    } : prev);
  }

  function applyAdvancedJson() {
    try {
      const parsed = JSON.parse(advancedJson) as SiteData;
      const normalized = normalizeSite(parsed);
      setSite(normalized);
      setAdvancedJson(JSON.stringify(normalized, null, 2));
      showToast("Advanced JSON applied to the editor.", true);
    } catch {
      showToast("Invalid JSON — check the syntax before applying.", false);
    }
  }

  async function save() {
    if (!site) return;
    setSaving(true);
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; site?: SiteData };
    setSaving(false);

    if (!res.ok) {
      showToast(data.error ?? "Failed to save settings.", false);
      return;
    }

    const saved = normalizeSite(data.site ?? site);
    setSite(saved);
    setAdvancedJson(JSON.stringify(saved, null, 2));
    showToast("Settings saved.", true);
  }

  if (!site) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <>
      <div className="sa-settings-head">
        <div>
          <h1 className="sa-h1">Settings</h1>
          <p className="sa-subtitle">Business details, contact information, navigation and site-wide SEO.</p>
        </div>
        <div className="sa-settings-head__meta">
          <span className="sa-badge sa-badge--primary">{site.locale || "sv-SE"}</span>
          <span>{previewHost}</span>
        </div>
      </div>

      <div className="sa-settings-grid">
        <section className="sa-settings-panel">
          <div className="sa-settings-panel__head">
            <div>
              <span className="sa-settings-kicker">Business</span>
              <h2>Site identity</h2>
            </div>
          </div>
          <div className="sa-settings-fields sa-settings-fields--two">
            <div className="sa-field">
              <label htmlFor="site-name">Business name</label>
              <input id="site-name" value={site.name ?? ""} onChange={(e) => setSite({ ...site, name: e.target.value })} />
            </div>
            <div className="sa-field">
              <label htmlFor="site-locale">Locale</label>
              <input id="site-locale" value={site.locale ?? ""} onChange={(e) => setSite({ ...site, locale: e.target.value })} placeholder="sv-SE" />
            </div>
            <div className="sa-field sa-settings-field--wide">
              <label htmlFor="site-tagline">Tagline</label>
              <input id="site-tagline" value={site.tagline ?? ""} onChange={(e) => setSite({ ...site, tagline: e.target.value })} />
            </div>
            <div className="sa-field sa-settings-field--wide">
              <label htmlFor="site-url">Public site URL</label>
              <input id="site-url" value={site.url ?? ""} onChange={(e) => setSite({ ...site, url: e.target.value })} placeholder="https://example.se" />
            </div>
            <div className="sa-field sa-settings-field--wide">
              <label htmlFor="site-copyright">Copyright text</label>
              <input id="site-copyright" value={site.brand?.copyright ?? ""} onChange={(e) => setBrandCopyright(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="sa-settings-panel">
          <div className="sa-settings-panel__head">
            <div>
              <span className="sa-settings-kicker">Contact</span>
              <h2>Customer-facing details</h2>
            </div>
          </div>
          <div className="sa-settings-fields sa-settings-fields--two">
            <div className="sa-field">
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" type="email" value={site.contact?.email ?? ""} onChange={(e) => setContact({ email: e.target.value })} />
            </div>
            <div className="sa-field">
              <label htmlFor="contact-phone">Phone</label>
              <input id="contact-phone" value={site.contact?.phone ?? ""} onChange={(e) => setContact({ phone: e.target.value })} />
            </div>
            <div className="sa-field sa-settings-field--wide">
              <label htmlFor="contact-street">Street</label>
              <input id="contact-street" value={site.contact?.address?.street ?? ""} onChange={(e) => setAddress("street", e.target.value)} />
            </div>
            <div className="sa-field">
              <label htmlFor="contact-postcode">Postal code</label>
              <input id="contact-postcode" value={site.contact?.address?.postalCode ?? ""} onChange={(e) => setAddress("postalCode", e.target.value)} />
            </div>
            <div className="sa-field">
              <label htmlFor="contact-city">City</label>
              <input id="contact-city" value={site.contact?.address?.city ?? ""} onChange={(e) => setAddress("city", e.target.value)} />
            </div>
            <div className="sa-field">
              <label htmlFor="contact-country">Country</label>
              <input id="contact-country" value={site.contact?.address?.country ?? ""} onChange={(e) => setAddress("country", e.target.value)} placeholder="SE" />
            </div>
          </div>

          <div className="sa-settings-subsection">
            <div className="sa-settings-subsection__head">
              <div>
                <strong>Opening hours</strong>
                <span>Shown by themes that support business hours.</span>
              </div>
              <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={addOpeningHour}>Add row</button>
            </div>
            <div className="sa-settings-list">
              {openingHours.length === 0 ? <div className="sa-settings-empty">No opening hours configured.</div> : null}
              {openingHours.map((row, index) => (
                <div className="sa-settings-row" key={`hours-${index}`}>
                  <input aria-label="Days" value={row.days} onChange={(e) => setOpeningHour(index, { days: e.target.value })} placeholder="Mån–Fre" />
                  <input aria-label="Hours" value={row.hours} onChange={(e) => setOpeningHour(index, { hours: e.target.value })} placeholder="09–17" />
                  <button type="button" className="sa-settings-icon-btn sa-settings-icon-btn--danger" onClick={() => removeOpeningHour(index)} aria-label="Remove opening hours row">×</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="sa-settings-panel">
        <div className="sa-settings-panel__head">
          <div>
            <span className="sa-settings-kicker">Navigation</span>
            <h2>Header and footer links</h2>
          </div>
          <p>Pages can add links automatically; use this area to rename, reorder or remove them.</p>
        </div>

        <div className="sa-settings-nav-columns">
          <NavEditor title="Main navigation" kind="primary" rows={primary} onAdd={() => addNav("primary")} onUpdate={updateNav} onRemove={removeNav} onMove={moveNav} />
          <NavEditor title="Footer navigation" kind="footer" rows={footer} onAdd={() => addNav("footer")} onUpdate={updateNav} onRemove={removeNav} onMove={moveNav} />
        </div>

        <div className="sa-settings-subsection sa-settings-subsection--cta">
          <div className="sa-settings-subsection__head">
            <div>
              <strong>Primary CTA</strong>
              <span>Optional call-to-action used by the header and compatible themes.</span>
            </div>
          </div>
          <div className="sa-settings-row sa-settings-row--link">
            <input aria-label="CTA label" value={site.navigation?.cta?.label ?? ""} onChange={(e) => setCta("label", e.target.value)} placeholder="Boka tid" />
            <input aria-label="CTA URL" value={site.navigation?.cta?.href ?? ""} onChange={(e) => setCta("href", e.target.value)} placeholder="/kontakt" />
          </div>
        </div>
      </section>

      <section className="sa-settings-panel">
        <div className="sa-settings-panel__head">
          <div>
            <span className="sa-settings-kicker">SEO</span>
            <h2>Site-wide defaults</h2>
          </div>
        </div>
        <div className="sa-settings-fields sa-settings-fields--two">
          <div className="sa-field">
            <label htmlFor="seo-title-template">Title template</label>
            <input id="seo-title-template" value={site.seo?.titleTemplate ?? ""} onChange={(e) => setSeo("titleTemplate", e.target.value)} placeholder="%s | Business name" />
            <div className="sa-field-hint">Use %s where the page title should appear.</div>
          </div>
          <div className="sa-field">
            <label htmlFor="seo-business-type">Schema business type</label>
            <input id="seo-business-type" value={site.seo?.businessType ?? ""} onChange={(e) => setSeo("businessType", e.target.value)} placeholder="LocalBusiness" />
          </div>
          <div className="sa-field sa-settings-field--wide">
            <label htmlFor="seo-description">Default description</label>
            <textarea id="seo-description" value={site.seo?.defaultDescription ?? ""} onChange={(e) => setSeo("defaultDescription", e.target.value)} rows={4} />
          </div>
          <div className="sa-field sa-settings-field--wide">
            <label htmlFor="seo-og">Default social image</label>
            <input id="seo-og" value={site.seo?.ogImage ?? ""} onChange={(e) => setSeo("ogImage", e.target.value)} placeholder="/uploads/og.jpg" />
          </div>
        </div>
      </section>

      <details className="sa-settings-advanced">
        <summary>Advanced · edit site.json</summary>
        <div className="sa-settings-advanced__body">
          <p>Use this only for fields that are not exposed in the visual editor. Apply JSON before saving.</p>
          <textarea className="sa-json-editor" value={advancedJson} onChange={(e) => setAdvancedJson(e.target.value)} rows={20} spellCheck={false} />
          <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={applyAdvancedJson}>Apply JSON to editor</button>
        </div>
      </details>

      <div className="sa-settings-savebar">
        <div>
          <strong>Site settings</strong>
          <span>Theme appearance is managed separately under Themes.</span>
        </div>
        <button className="sa-btn sa-btn--primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}

function NavEditor({
  title,
  kind,
  rows,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  title: string;
  kind: "primary" | "footer";
  rows: NavLink[];
  onAdd: () => void;
  onUpdate: (kind: "primary" | "footer", index: number, patch: Partial<NavLink>) => void;
  onRemove: (kind: "primary" | "footer", index: number) => void;
  onMove: (kind: "primary" | "footer", index: number, delta: -1 | 1) => void;
}) {
  return (
    <div className="sa-settings-nav-editor">
      <div className="sa-settings-subsection__head">
        <strong>{title}</strong>
        <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={onAdd}>Add link</button>
      </div>
      <div className="sa-settings-list">
        {rows.length === 0 ? <div className="sa-settings-empty">No links configured.</div> : null}
        {rows.map((row, index) => (
          <div className="sa-settings-row sa-settings-row--nav" key={`${kind}-${index}`}>
            <span className="sa-settings-row__handle">{index + 1}</span>
            <input aria-label={`${title} label ${index + 1}`} value={row.label} onChange={(e) => onUpdate(kind, index, { label: e.target.value })} placeholder="Label" />
            <input aria-label={`${title} URL ${index + 1}`} value={row.href} onChange={(e) => onUpdate(kind, index, { href: e.target.value })} placeholder="/path" />
            <div className="sa-settings-row__actions">
              <button type="button" className="sa-settings-icon-btn" onClick={() => onMove(kind, index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
              <button type="button" className="sa-settings-icon-btn" onClick={() => onMove(kind, index, 1)} disabled={index === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="sa-settings-icon-btn sa-settings-icon-btn--danger" onClick={() => onRemove(kind, index)} aria-label="Remove link">×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
