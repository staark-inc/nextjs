"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./redirects.module.css";

type RedirectStatus = 301 | 302;
type RedirectRule = {
  id: string;
  from: string;
  to: string;
  status: RedirectStatus;
  enabled: boolean;
  source: "manual" | "page-path-change";
  createdAt: string;
  updatedAt: string;
};
type RedirectIssue = {
  severity: "error" | "warning";
  ruleId?: string;
  message: string;
};

const emptyDraft = { from: "", to: "", status: 301 as RedirectStatus };

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);
  const [issues, setIssues] = useState<RedirectIssue[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [working, setWorking] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const activeCount = redirects.filter((rule) => rule.enabled).length;
  const permanentCount = redirects.filter((rule) => rule.status === 301).length;
  const temporaryCount = redirects.filter((rule) => rule.status === 302).length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  function applyState(data: { redirects?: RedirectRule[]; issues?: RedirectIssue[] }) {
    setRedirects(data.redirects ?? []);
    setIssues(data.issues ?? []);
  }

  async function load() {
    const res = await fetch("/api/admin/redirects", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not load redirects.", false);
      return;
    }
    applyState(data);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    setWorking("create");
    const res = await fetch("/api/admin/redirects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, enabled: true }),
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not create redirect.", false);
      return;
    }

    applyState(data);
    setDraft(emptyDraft);
    showToast("Redirect created and active.", true);
  }

  function patchLocal(id: string, patch: Partial<RedirectRule>) {
    setRedirects((current) =>
      current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
    );
  }

  async function save(rule: RedirectRule) {
    setWorking(`save:${rule.id}`);
    const res = await fetch("/api/admin/redirects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not save redirect.", false);
      await load();
      return;
    }

    applyState(data);
    showToast("Redirect saved.", true);
  }

  async function toggle(rule: RedirectRule) {
    const next = { ...rule, enabled: !rule.enabled };
    patchLocal(rule.id, { enabled: next.enabled });
    await save(next);
  }

  async function remove(rule: RedirectRule) {
    if (!confirm(`Delete redirect ${rule.from} → ${rule.to}?`)) return;

    setWorking(`delete:${rule.id}`);
    const res = await fetch("/api/admin/redirects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id }),
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not delete redirect.", false);
      return;
    }

    applyState(data);
    showToast("Redirect deleted.", true);
  }

  const ruleIssues = useMemo(() => {
    const map = new Map<string, RedirectIssue[]>();
    for (const issue of issues) {
      if (!issue.ruleId) continue;
      const list = map.get(issue.ruleId) ?? [];
      list.push(issue);
      map.set(issue.ruleId, list);
    }
    return map;
  }, [issues]);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Traffic & SEO</span>
          <h1 className="sa-h1">Redirects</h1>
          <p className="sa-subtitle">
            Keep old URLs working when pages move. Rules apply immediately without rebuilding the site.
          </p>
        </div>
      </div>

      <section className="sa-stats sa-stats--dashboard" aria-label="Redirect overview">
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Active</div>
          <div className="sa-stat__value">{activeCount}</div>
          <div className="sa-stat__desc">Live redirect rules</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Permanent</div>
          <div className="sa-stat__value">{permanentCount}</div>
          <div className="sa-stat__desc">301 redirects</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Temporary</div>
          <div className="sa-stat__value">{temporaryCount}</div>
          <div className="sa-stat__desc">302 redirects</div>
        </article>
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Warnings</div>
          <div className="sa-stat__value">{warningCount}</div>
          <div className="sa-stat__desc">Chains to review</div>
        </article>
      </section>

      {issues.length ? (
        <section className={styles.issues}>
          {issues.map((issue, index) => (
            <div className={issue.severity === "error" ? styles.issueError : styles.issueWarning} key={`${issue.message}-${index}`}>
              <strong>{issue.severity === "error" ? "Error" : "Warning"}</strong>
              <span>{issue.message}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className={`sa-card ${styles.create}`}>
        <div>
          <span className="sa-card__eyebrow">New rule</span>
          <h2>Create redirect</h2>
          <p>Use 301 for permanent moves and 302 for temporary redirects.</p>
        </div>
        <div className={styles.createFields}>
          <input
            value={draft.from}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            placeholder="/old-page"
            aria-label="Redirect source"
          />
          <span aria-hidden="true">→</span>
          <input
            value={draft.to}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            placeholder="/new-page or https://…"
            aria-label="Redirect destination"
          />
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: Number(event.target.value) as RedirectStatus }))}
            aria-label="Redirect status"
          >
            <option value={301}>301 Permanent</option>
            <option value={302}>302 Temporary</option>
          </select>
          <button className="sa-btn sa-btn--primary" onClick={() => void create()} disabled={working === "create" || !draft.from.trim() || !draft.to.trim()}>
            {working === "create" ? "Creating…" : "Create redirect"}
          </button>
        </div>
      </section>

      <section className={`sa-card ${styles.listCard}`}>
        <div className={styles.listHeader}>
          <div>
            <span className="sa-card__eyebrow">Rules</span>
            <h2>{redirects.length} redirect{redirects.length === 1 ? "" : "s"}</h2>
          </div>
          <span className={styles.hint}>Changing a page path creates a 301 automatically.</span>
        </div>

        {redirects.length ? (
          <div className={styles.list}>
            {redirects.map((rule) => (
              <article className={`${styles.row} ${!rule.enabled ? styles.rowDisabled : ""}`} key={rule.id}>
                <div className={styles.statusCell}>
                  <button
                    type="button"
                    className={`${styles.toggle} ${rule.enabled ? styles.toggleOn : ""}`}
                    onClick={() => void toggle(rule)}
                    aria-label={rule.enabled ? "Disable redirect" : "Enable redirect"}
                    disabled={Boolean(working)}
                  >
                    <span />
                  </button>
                  <small>{rule.enabled ? "Active" : "Off"}</small>
                </div>

                <div className={styles.ruleFields}>
                  <label>
                    <span>From</span>
                    <input value={rule.from} onChange={(event) => patchLocal(rule.id, { from: event.target.value })} />
                  </label>
                  <span className={styles.arrow}>→</span>
                  <label>
                    <span>To</span>
                    <input value={rule.to} onChange={(event) => patchLocal(rule.id, { to: event.target.value })} />
                  </label>
                  <label className={styles.statusSelect}>
                    <span>Status</span>
                    <select value={rule.status} onChange={(event) => patchLocal(rule.id, { status: Number(event.target.value) as RedirectStatus })}>
                      <option value={301}>301</option>
                      <option value={302}>302</option>
                    </select>
                  </label>
                </div>

                <div className={styles.rowMeta}>
                  <span>{rule.source === "page-path-change" ? "Created from page move" : "Manual"}</span>
                  {(ruleIssues.get(rule.id) ?? []).map((issue) => <small key={issue.message}>{issue.message}</small>)}
                </div>

                <div className={styles.actions}>
                  <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => void save(rule)} disabled={Boolean(working)}>
                    {working === `save:${rule.id}` ? "Saving…" : "Save"}
                  </button>
                  <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={() => void remove(rule)} disabled={Boolean(working)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">No redirects yet</div>
            <div className="sa-empty__desc">Create a rule manually, or change the path of an existing page.</div>
          </div>
        )}
      </section>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
