"use client";

import { useEffect, useState } from "react";

type InboxStatus = "new" | "read" | "replied" | "archived";
type BookingStatus = "pending" | "confirmed" | "declined";
type SubmissionKind = "contact" | "lead" | "booking";

type Submission = {
  id: string;
  formId: string;
  kind: SubmissionKind;
  fields: Record<string, unknown>;
  pageUrl?: string;
  receivedAt: string;
  status: InboxStatus;
  bookingStatus?: BookingStatus;
};

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function statusClass(status: InboxStatus): string {
  if (status === "new") return "sa-status--unread";
  if (status === "archived") return "sa-status--pending";
  return "sa-status--read";
}

function kindLabel(kind: SubmissionKind): string {
  if (kind === "contact") return "Messages";
  if (kind === "lead") return "Leads";
  return "Bookings";
}

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | SubmissionKind>("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/forms");
    setSubmissions(res.ok ? await res.json() : []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function clearAll() {
    if (!confirm("Clear all submissions? This cannot be undone.")) return;
    const res = await fetch("/api/admin/forms", { method: "DELETE" });
    if (res.ok) {
      setSubmissions([]);
      showToast("All submissions cleared.", true);
    } else {
      showToast("Could not clear the inbox.", false);
    }
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
  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.kind === filter);
  const today = new Date().toDateString();
  const todayCount = submissions.filter((s) => new Date(s.receivedAt).toDateString() === today).length;
  const openCount = submissions.filter((s) => s.status === "new" || s.status === "read").length;

  if (loading) return <p className="sa-loading">Loading inbox…</p>;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>Inbox</span>
      </div>

      <h1 className="sa-h1">Inbox</h1>
      <p className="sa-subtitle">Open submissions, manage status and follow up with customers.</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Total</div>
          <div className="sa-stat__value">{submissions.length}</div>
          <div className="sa-stat__desc">All submissions</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Open</div>
          <div className="sa-stat__value">{openCount}</div>
          <div className="sa-stat__desc">Need attention</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Today</div>
          <div className="sa-stat__value">{todayCount}</div>
          <div className="sa-stat__desc">Received today</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Forms</div>
          <div className="sa-stat__value">{formIds.length}</div>
          <div className="sa-stat__desc">Active sources</div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__icon">✉️</div>
            <div className="sa-empty__title">No submissions yet</div>
            <div className="sa-empty__desc">Messages, leads and booking requests from the website will appear here.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="sa-toolbar sa-toolbar--wrap">
            <div className="sa-tab-bar">
              <button className={`sa-tab${filter === "all" ? " sa-tab--active" : ""}`} onClick={() => setFilter("all")}>
                All <span className="sa-tab__count">{submissions.length}</span>
              </button>
              {(["contact", "lead", "booking"] as const).map((kind) => {
                const count = submissions.filter((s) => s.kind === kind).length;
                return (
                  <button key={kind} className={`sa-tab${filter === kind ? " sa-tab--active" : ""}`} onClick={() => setFilter(kind)}>
                    {kindLabel(kind)} <span className="sa-tab__count">{count}</span>
                  </button>
                );
              })}
            </div>
            <span className="sa-toolbar--right" />
            <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={clearAll}>Clear all</button>
          </div>

          <div className="sa-card sa-table-card">
            <div className="sa-table-scroll">
              <table className="sa-table sa-inbox-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>From</th>
                    <th>Request</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const name = text(s.fields.name) || "—";
                    const email = text(s.fields.email);
                    const message = text(s.fields.message) || text(s.fields.subject) || text(s.fields.booking_item) || text(s.fields.booking_type);
                    return (
                      <tr key={s.id}>
                        <td className="sa-table__mono">{s.id}</td>
                        <td>
                          <a className="sa-inbox-name" href={`/admin/forms/${s.id}`}>{name}</a>
                          {email ? <div className="sa-table__secondary">{email}</div> : null}
                        </td>
                        <td>
                          <span className="sa-badge sa-badge--primary">{kindLabel(s.kind)}</span>
                          <span className="sa-table__secondary">{s.formId}</span>
                          {s.bookingStatus ? <span className={`sa-badge sa-booking-badge sa-booking-badge--${s.bookingStatus}`}>{s.bookingStatus}</span> : null}
                          {message ? <div className="sa-inbox-preview">{message.slice(0, 110)}{message.length > 110 ? "…" : ""}</div> : null}
                        </td>
                        <td>
                          <span className={`sa-status ${statusClass(s.status)}`}>
                            <span className="sa-status__dot" />
                            {s.status}
                          </span>
                        </td>
                        <td className="sa-table__date">{formatDate(s.receivedAt)}</td>
                        <td className="sa-table__actions">
                          <a className="sa-btn sa-btn--ghost sa-btn--sm" href={`/admin/forms/${s.id}`}>Open</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
