"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type InboxStatus = "new" | "read" | "replied" | "archived";
type BookingStatus = "pending" | "confirmed" | "declined";
type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "offer_sent"
  | "won"
  | "lost";
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
  leadStage?: LeadStage;
  followUpAt?: string;
  internalNote?: string;
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

function leadStageLabel(stage: LeadStage): string {
  if (stage === "new") return "New";
  if (stage === "contacted") return "Contacted";
  if (stage === "qualified") return "Qualified";
  if (stage === "offer_sent") return "Offer sent";
  if (stage === "won") return "Won";
  return "Lost";
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function followUpState(value?: string): "none" | "upcoming" | "today" | "overdue" {
  if (!value) return "none";
  const today = localDateKey();
  if (value === today) return "today";
  if (value < today) return "overdue";
  return "upcoming";
}

function formatFollowUp(value?: string): string {
  if (!value) return "—";
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return value;

  const [year, month, day] = parts;
  const date = new Date(year!, month! - 1, day!);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function nextLeadStage(stage: LeadStage): LeadStage | null {
  if (stage === "new") return "contacted";
  if (stage === "contacted") return "qualified";
  if (stage === "qualified") return "offer_sent";
  if (stage === "offer_sent") return "won";
  return null;
}

function nextLeadActionLabel(stage: LeadStage): string | null {
  if (stage === "new") return "Mark contacted";
  if (stage === "contacted") return "Qualify";
  if (stage === "qualified") return "Offer sent";
  if (stage === "offer_sent") return "Mark won";
  return null;
}

function followUpInDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | SubmissionKind>("all");
  const [leadStageFilter, setLeadStageFilter] = useState<"all" | LeadStage>("all");
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
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

  async function updateLead(
    id: string,
    body: Record<string, string | null>,
    successMessage: string,
  ) {
    setSavingLeadId(id);

    try {
      const res = await fetch(`/api/admin/forms/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        showToast("Could not update the lead.", false);
        return;
      }

      const updated = (await res.json()) as Submission;

      setSubmissions((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );

      showToast(successMessage, true);
    } catch {
      showToast("Could not update the lead.", false);
    } finally {
      setSavingLeadId(null);
    }
  }

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

  const kindFiltered =
    filter === "all"
      ? submissions
      : submissions.filter((s) => s.kind === filter);

  const filtered =
    filter === "lead" && leadStageFilter !== "all"
      ? kindFiltered.filter(
          (s) => (s.leadStage ?? "new") === leadStageFilter,
        )
      : kindFiltered;

  const leadSubmissions = submissions.filter((s) => s.kind === "lead");

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
              <button
                className={`sa-tab${filter === "all" ? " sa-tab--active" : ""}`}
                onClick={() => {
                  setFilter("all");
                  setLeadStageFilter("all");
                }}
              >
                All <span className="sa-tab__count">{submissions.length}</span>
              </button>
              {(["contact", "lead", "booking"] as const).map((kind) => {
                const count = submissions.filter((s) => s.kind === kind).length;
                return (
                  <button
                    key={kind}
                    className={`sa-tab${filter === kind ? " sa-tab--active" : ""}`}
                    onClick={() => {
                      setFilter(kind);
                      if (kind !== "lead") setLeadStageFilter("all");
                    }}
                  >
                    {kindLabel(kind)} <span className="sa-tab__count">{count}</span>
                  </button>
                );
              })}
            </div>
            <span className="sa-toolbar--right" />
            <button className="sa-btn sa-btn--danger sa-btn--sm" onClick={clearAll}>Clear all</button>
          </div>

          {filter === "lead" ? (
            <div className={`${styles.leadFilters} sa-toolbar sa-toolbar--wrap`}>
              <div className="sa-tab-bar">
                <button
                  className={`sa-tab${leadStageFilter === "all" ? " sa-tab--active" : ""}`}
                  onClick={() => setLeadStageFilter("all")}
                >
                  All stages
                  <span className="sa-tab__count">{leadSubmissions.length}</span>
                </button>

                {(
                  [
                    "new",
                    "contacted",
                    "qualified",
                    "offer_sent",
                    "won",
                    "lost",
                  ] as LeadStage[]
                ).map((stage) => {
                  const count = leadSubmissions.filter(
                    (lead) => (lead.leadStage ?? "new") === stage,
                  ).length;

                  return (
                    <button
                      key={stage}
                      className={`sa-tab${leadStageFilter === stage ? " sa-tab--active" : ""}`}
                      onClick={() => setLeadStageFilter(stage)}
                    >
                      {leadStageLabel(stage)}
                      <span className="sa-tab__count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="sa-card sa-table-card">
            <div className="sa-table-scroll">
              <table className="sa-table sa-inbox-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>{filter === "lead" ? "Customer" : "From"}</th>
                    {filter === "lead" ? (
                      <>
                        <th>Stage</th>
                        <th>Follow-up</th>
                      </>
                    ) : (
                      <th>Request</th>
                    )}
                    <th>Status</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const name = text(s.fields.name) || "—";
                    const email = text(s.fields.email);
                    const company = text(s.fields.company);
                    const packageName = text(s.fields.package);
                    const message =
                      text(s.fields.message) ||
                      text(s.fields.subject) ||
                      text(s.fields.booking_item) ||
                      text(s.fields.booking_type);

                    const leadStage = s.leadStage ?? "new";
                    const followState = followUpState(s.followUpAt);
                    const nextStage = nextLeadStage(leadStage);
                    const nextActionLabel = nextLeadActionLabel(leadStage);
                    const savingLead = savingLeadId === s.id;

                    return (
                      <tr key={s.id}>
                        <td className="sa-table__mono">{s.id}</td>
                        <td>
                          <a className="sa-inbox-name" href={`/admin/forms/${s.id}`}>
                            {name}
                          </a>
                          {email ? (
                            <div className="sa-table__secondary">{email}</div>
                          ) : null}
                          {filter === "lead" && company ? (
                            <div className="sa-table__secondary">{company}</div>
                          ) : null}
                        </td>

                        {filter === "lead" ? (
                          <>
                            <td>
                              <span
                                className={`${styles.stageBadge} ${
                                  styles[`stage_${leadStage}`]
                                }`}
                              >
                                {leadStageLabel(leadStage)}
                              </span>
                              {packageName ? (
                                <div className="sa-table__secondary">
                                  {packageName}
                                </div>
                              ) : null}
                            </td>

                            <td>
                              {s.followUpAt ? (
                                <>
                                  <div
                                    className={`${styles.followUpDate} ${
                                      followState === "overdue"
                                        ? styles.followUpOverdue
                                        : followState === "today"
                                          ? styles.followUpToday
                                          : styles.followUpUpcoming
                                    }`}
                                  >
                                    {formatFollowUp(s.followUpAt)}
                                  </div>

                                  {followState === "overdue" ? (
                                    <div className={styles.followUpFlag}>
                                      Overdue
                                    </div>
                                  ) : null}

                                  {followState === "today" ? (
                                    <div className={styles.followUpFlag}>
                                      Due today
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <span className="sa-table__secondary">
                                  No follow-up
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td>
                            <span className="sa-badge sa-badge--primary">
                              {kindLabel(s.kind)}
                            </span>
                            <span className="sa-table__secondary">{s.formId}</span>

                            {s.bookingStatus ? (
                              <span
                                className={`sa-badge sa-booking-badge sa-booking-badge--${s.bookingStatus}`}
                              >
                                {s.bookingStatus}
                              </span>
                            ) : null}

                            {message ? (
                              <div className="sa-inbox-preview">
                                {message.slice(0, 110)}
                                {message.length > 110 ? "…" : ""}
                              </div>
                            ) : null}
                          </td>
                        )}
                        <td>
                          <span className={`sa-status ${statusClass(s.status)}`}>
                            <span className="sa-status__dot" />
                            {s.status}
                          </span>
                        </td>
                        <td className="sa-table__date">{formatDate(s.receivedAt)}</td>
                        <td className="sa-table__actions">
                          {filter === "lead" ? (
                            <div className={styles.quickActions}>
                              {nextStage && nextActionLabel ? (
                                <button
                                  className="sa-btn sa-btn--primary sa-btn--sm"
                                  disabled={savingLead}
                                  onClick={() =>
                                    void updateLead(
                                      s.id,
                                      { leadStage: nextStage },
                                      `Lead moved to ${leadStageLabel(nextStage)}.`,
                                    )
                                  }
                                >
                                  {nextActionLabel}
                                </button>
                              ) : null}

                              <button
                                className="sa-btn sa-btn--ghost sa-btn--sm"
                                disabled={savingLead}
                                title="Set follow-up 3 days from today"
                                onClick={() =>
                                  void updateLead(
                                    s.id,
                                    { followUpAt: followUpInDays(3) },
                                    "Follow-up set for 3 days from today.",
                                  )
                                }
                              >
                                +3d
                              </button>

                              <button
                                className="sa-btn sa-btn--ghost sa-btn--sm"
                                disabled={savingLead}
                                title="Set follow-up 7 days from today"
                                onClick={() =>
                                  void updateLead(
                                    s.id,
                                    { followUpAt: followUpInDays(7) },
                                    "Follow-up set for 7 days from today.",
                                  )
                                }
                              >
                                +7d
                              </button>

                              {s.followUpAt ? (
                                <button
                                  className="sa-btn sa-btn--ghost sa-btn--sm"
                                  disabled={savingLead}
                                  title="Clear follow-up"
                                  onClick={() =>
                                    void updateLead(
                                      s.id,
                                      { followUpAt: null },
                                      "Follow-up cleared.",
                                    )
                                  }
                                >
                                  Clear
                                </button>
                              ) : null}

                              <a
                                className="sa-btn sa-btn--ghost sa-btn--sm"
                                href={`/admin/forms/${s.id}`}
                              >
                                Open
                              </a>
                            </div>
                          ) : (
                            <a
                              className="sa-btn sa-btn--ghost sa-btn--sm"
                              href={`/admin/forms/${s.id}`}
                            >
                              Open
                            </a>
                          )}
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
