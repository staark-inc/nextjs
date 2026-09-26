"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type InboxStatus = "new" | "read" | "replied" | "archived";
type BookingStatus = "pending" | "confirmed" | "declined";
type Activity = { at: string; actor: string; message: string };
type Submission = {
  id: string;
  formId: string;
  fields: Record<string, unknown>;
  pageUrl?: string;
  receivedAt: string;
  status: InboxStatus;
  bookingStatus?: BookingStatus;
  activity: Activity[];
};

function value(fields: Record<string, unknown>, key: string): string {
  const current = fields[key];
  return typeof current === "string" || typeof current === "number" ? String(current) : "";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function InboxDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [item, setItem] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load(markRead = false) {
    const res = await fetch(`/api/admin/forms/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setItem(null);
      setLoading(false);
      return;
    }
    const data = await res.json() as Submission;
    setItem(data);
    setSubject((current) => current || `Re: ${data.formId} · ${data.id}`);
    setLoading(false);
    if (markRead && data.status === "new") {
      const next = await fetch(`/api/admin/forms/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      if (next.ok) setItem(await next.json());
    }
  }

  useEffect(() => { void load(true); }, [id]);

  async function update(body: Record<string, string>) {
    setSaving(true);
    const res = await fetch(`/api/admin/forms/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setItem(await res.json());
      showToast("Saved.", true);
    } else {
      showToast("Could not save the change.", false);
    }
    setSaving(false);
  }

  const email = item ? value(item.fields, "email") : "";
  const phone = item ? value(item.fields, "phone") : "";
  const name = item ? value(item.fields, "name") || "Customer" : "Customer";
  const customerMessage = item ? value(item.fields, "message") || value(item.fields, "subject") : "";
  const bookingFields = useMemo(() => {
    if (!item?.bookingStatus) return [];
    return [
      ["Date", value(item.fields, "booking_date")],
      ["Time", value(item.fields, "booking_time")],
      ["Type", value(item.fields, "booking_type") || value(item.fields, "booking_item")],
      ["Guests", value(item.fields, "booking_guests")],
    ].filter((entry) => entry[1]);
  }, [item]);

  function openMailApp() {
    if (!email) return;
    const body = message.trim();
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (loading) return <p className="sa-loading">Loading request…</p>;
  if (!item) return <div className="sa-error">Submission not found.</div>;

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a><span>/</span>
        <a href="/admin/forms">Inbox</a><span>/</span>
        <span>{item.id}</span>
      </div>

      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">{item.formId}</p>
          <h1 className="sa-h1">{name}</h1>
          <p className="sa-subtitle">{item.id} · received {formatDate(item.receivedAt)}</p>
        </div>
        <div className="sa-page-header__actions">
          <a className="sa-btn sa-btn--ghost" href="/admin/forms">Back to inbox</a>
        </div>
      </div>

      <div className="sa-inbox-detail-grid">
        <div className="sa-inbox-detail-main">
          {item.bookingStatus ? (
            <section className="sa-card">
              <div className="sa-card__header sa-card__header--row">
                <div>
                  <p className="sa-card__eyebrow">Booking</p>
                  <h2>Booking request</h2>
                </div>
                <span className={`sa-badge sa-booking-badge sa-booking-badge--${item.bookingStatus}`}>{item.bookingStatus}</span>
              </div>
              {bookingFields.length ? (
                <div className="sa-booking-facts">
                  {bookingFields.map(([label, current]) => (
                    <div key={label}><span>{label}</span><strong>{current}</strong></div>
                  ))}
                </div>
              ) : null}
              <div className="sa-inline-actions">
                <button className="sa-btn sa-btn--success" disabled={saving || item.bookingStatus === "confirmed"} onClick={() => void update({ bookingStatus: "confirmed" })}>Confirm booking</button>
                <button className="sa-btn sa-btn--danger" disabled={saving || item.bookingStatus === "declined"} onClick={() => void update({ bookingStatus: "declined" })}>Decline</button>
              </div>
              <p className="sa-note">Local admin records the booking decision. Customer email delivery remains a Hub/mail integration responsibility.</p>
            </section>
          ) : null}

          <section className="sa-card">
            <div className="sa-card__header">
              <p className="sa-card__eyebrow">Message</p>
              <h2>Submission details</h2>
            </div>
            {customerMessage ? <div className="sa-message-box">{customerMessage}</div> : null}
            <dl className="sa-field-list">
              {Object.entries(item.fields).map(([key, raw]) => {
                if (key === "message" || key === "subject") return null;
                const current = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
                if (!current) return null;
                return <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{current}</dd></div>;
              })}
            </dl>
          </section>

          <section className="sa-card">
            <div className="sa-card__header">
              <p className="sa-card__eyebrow">Reply</p>
              <h2>Reply to {name}</h2>
            </div>
            {email ? (
              <>
                <div className="sa-field">
                  <label htmlFor="reply-subject">Subject</label>
                  <input id="reply-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="sa-field">
                  <label htmlFor="reply-message">Message</label>
                  <textarea id="reply-message" className="sa-reply-message" placeholder="Write your reply…" value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <div className="sa-inline-actions">
                  <button className="sa-btn sa-btn--primary" onClick={openMailApp}>Open in mail app</button>
                  <button className="sa-btn sa-btn--ghost" disabled={saving || item.status === "replied"} onClick={() => void update({ status: "replied", activityMessage: "Reply marked as handled" })}>Mark as replied</button>
                </div>
              </>
            ) : <p className="sa-note">This submission has no email address.</p>}
          </section>
        </div>

        <aside className="sa-inbox-detail-side">
          <section className="sa-card">
            <div className="sa-card__header"><p className="sa-card__eyebrow">Contact</p><h2>Customer</h2></div>
            <dl className="sa-detail-list">
              {email ? <div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
              {phone ? <div><dt>Phone</dt><dd><a href={`tel:${phone}`}>{phone}</a></dd></div> : null}
              {item.pageUrl ? <div><dt>Page</dt><dd><a href={item.pageUrl} target="_blank" rel="noopener noreferrer">{item.pageUrl}</a></dd></div> : null}
              <div><dt>Form</dt><dd>{item.formId}</dd></div>
              <div><dt>Reference</dt><dd>{item.id}</dd></div>
            </dl>
            <div className="sa-field sa-status-select">
              <label htmlFor="message-status">Message status</label>
              <select id="message-status" value={item.status} disabled={saving} onChange={(e) => void update({ status: e.target.value })}>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </section>

          <section className="sa-card">
            <div className="sa-card__header"><p className="sa-card__eyebrow">Activity</p><h2>History</h2></div>
            <ol className="sa-activity-list">
              {[...item.activity].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  <span className="sa-activity-dot" />
                  <small>{formatDate(entry.at)} · {entry.actor}</small>
                  <strong>{entry.message}</strong>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
