"use client";

import { useEffect, useState } from "react";

type Submission = {
  formId: string;
  fields: Record<string, string>;
  pageUrl?: string;
  receivedAt: string;
  meta?: Record<string, string>;
};

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/forms");
    setSubmissions(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function clearAll() {
    if (!confirm("Clear all submissions? This cannot be undone.")) return;
    await fetch("/api/admin/forms", { method: "DELETE" });
    setSubmissions([]);
    showToast("All submissions cleared.", true);
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
        ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  const formIds = [...new Set(submissions.map((s) => s.formId))];
  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.formId === filter);
  const today = new Date().toDateString();
  const todayCount = submissions.filter((s) => new Date(s.receivedAt).toDateString() === today).length;

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>Inbox</span>
      </div>

      <h1 className="sa-h1">Inbox</h1>
      <p className="sa-subtitle">Messages, bookings and submissions from every form on the site.</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Total</div>
          <div className="sa-stat__value">{submissions.length}</div>
          <div className="sa-stat__desc">All submissions</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Today</div>
          <div className="sa-stat__value">{todayCount}</div>
          <div className="sa-stat__desc">Received today</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Forms</div>
          <div className="sa-stat__value">{formIds.length}</div>
          <div className="sa-stat__desc">Active forms</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Source</div>
          <div className="sa-stat__value sa-stat__value--sm">Local</div>
          <div className="sa-stat__desc">.staark/submissions.jsonl</div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__icon">✉️</div>
            <div className="sa-empty__title">No submissions yet</div>
            <div className="sa-empty__desc">Fill out a contact or booking form on the site and it will appear here.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="sa-toolbar">
            <div className="sa-tab-bar">
              <button className={`sa-tab${filter === "all" ? " sa-tab--active" : ""}`} onClick={() => setFilter("all")}>
                All <span className="sa-tab__count">{submissions.length}</span>
              </button>
              {formIds.map((id) => {
                const count = submissions.filter((s) => s.formId === id).length;
                return (
                  <button key={id} className={`sa-tab${filter === id ? " sa-tab--active" : ""}`} onClick={() => setFilter(id)}>
                    {id} <span className="sa-tab__count">{count}</span>
                  </button>
                );
              })}
            </div>
            <span className="sa-toolbar--right" />
            <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={clearAll}>Clear all</button>
          </div>

          <div className="sa-card" style={{ padding: 0, overflow: "auto" }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const name = s.fields.name || s.fields.Name || "—";
                  const email = s.fields.email || s.fields.Email || "";
                  const message = s.fields.message || s.fields.Message || s.fields.subject || s.fields.Subject || "";
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        {email && <div style={{ color: "var(--sa-muted)", fontSize: 12 }}>{email}</div>}
                      </td>
                      <td>
                        <span className="sa-badge sa-badge--primary" style={{ marginBottom: 4, display: "inline-block" }}>{s.formId}</span>
                        {message && <div style={{ fontSize: 13, marginTop: 2 }}>{String(message).slice(0, 120)}{String(message).length > 120 ? "…" : ""}</div>}
                      </td>
                      <td>
                        <span className="sa-status sa-status--read">
                          <span className="sa-status__dot" />
                          Received
                        </span>
                      </td>
                      <td className="sa-table__date">{formatDate(s.receivedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {toast && <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div>}
    </>
  );
}
