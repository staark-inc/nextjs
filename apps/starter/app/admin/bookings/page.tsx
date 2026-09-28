"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_STATUS_CHANGED_EVENT } from "../admin-events";

type InboxStatus = "new" | "read" | "replied" | "archived";
type BookingStatus = "pending" | "confirmed" | "declined";

type Submission = {
  id: string;
  formId: string;
  fields: Record<string, unknown>;
  receivedAt: string;
  status: InboxStatus;
  bookingStatus?: BookingStatus;
};

type Booking = Submission & { bookingStatus: BookingStatus };

type Tab = "pending" | "confirmed" | "declined" | "all";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "pending", label: "Waiting" },
  { id: "confirmed", label: "Confirmed" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

/** Local midnight of a YYYY-MM-DD booking date, or null. */
function bookingDay(booking: Submission): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(booking.fields.booking_date));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatWhen(booking: Submission): string {
  const day = bookingDay(booking);
  const time = text(booking.fields.booking_time);
  const date = day
    ? day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : text(booking.fields.booking_date);
  return [date, time].filter(Boolean).join(", ") || "No time given";
}

function formatReceived(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/forms");
      const all: Submission[] = res.ok ? await res.json() : [];
      setBookings(all.filter((item): item is Booking => Boolean(item.bookingStatus)));
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(
    () => ({
      pending: bookings.filter((b) => b.bookingStatus === "pending").length,
      confirmed: bookings.filter((b) => b.bookingStatus === "confirmed").length,
      declined: bookings.filter((b) => b.bookingStatus === "declined").length,
      all: bookings.length,
    }),
    [bookings],
  );

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings.filter((b) => b.bookingStatus === "confirmed" && (bookingDay(b)?.getTime() ?? -1) >= today.getTime()).length;
  }, [bookings]);

  // Open on the requests that need an answer, or everything when none do.
  const activeTab: Tab = tab ?? (counts.pending ? "pending" : "all");

  const visible = useMemo(() => {
    const list = activeTab === "all" ? bookings : bookings.filter((b) => b.bookingStatus === activeTab);
    const byReceived = (a: Booking, b: Booking) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt);
    if (activeTab !== "pending") return [...list].sort(byReceived);
    // Soonest booking first; requests without a date go last.
    return [...list].sort((a, b) => (bookingDay(a)?.getTime() ?? Infinity) - (bookingDay(b)?.getTime() ?? Infinity) || byReceived(a, b));
  }, [bookings, activeTab]);

  async function answer(booking: Booking, bookingStatus: "confirmed" | "declined") {
    if (busy) return;
    setBusy(booking.id);
    const body = { bookingStatus, ...(booking.status === "new" ? { status: "read" } : {}) };
    try {
      const res = await fetch(`/api/admin/forms/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as Booking;
      setBookings((current) => current.map((b) => (b.id === booking.id ? updated : b)));
      window.dispatchEvent(new Event(ADMIN_STATUS_CHANGED_EVENT));
      const name = text(booking.fields.name) || "the customer";
      showToast(`Booking from ${name} ${bookingStatus}.`, true);
    } catch {
      showToast("Could not save the change. Try again.", false);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="sa-loading">Loading bookings…</p>;

  return (
    <>
      <div className="sa-breadcrumb">
        <Link href="/admin">Dashboard</Link>
        <span>/</span>
        <span>Bookings</span>
      </div>

      <h1 className="sa-h1">Bookings</h1>
      <p className="sa-subtitle">Confirm or decline booking requests from the website.</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Waiting</div>
          <div className="sa-stat__value">{counts.pending}</div>
          <div className="sa-stat__desc">Need an answer</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Upcoming</div>
          <div className="sa-stat__value">{upcoming}</div>
          <div className="sa-stat__desc">Confirmed, from today</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Confirmed</div>
          <div className="sa-stat__value">{counts.confirmed}</div>
          <div className="sa-stat__desc">All time</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Declined</div>
          <div className="sa-stat__value">{counts.declined}</div>
          <div className="sa-stat__desc">All time</div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__title">No booking requests yet</div>
            <div className="sa-empty__desc">Requests from booking forms on the website will appear here.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="sa-toolbar sa-toolbar--wrap">
            <div className="sa-tab-bar">
              {TABS.map(({ id, label }) => (
                <button key={id} className={`sa-tab${activeTab === id ? " sa-tab--active" : ""}`} onClick={() => setTab(id)}>
                  {label} <span className="sa-tab__count">{counts[id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sa-card sa-table-card">
            {visible.length === 0 ? (
              <div className="sa-empty sa-empty--compact">
                <div className="sa-empty__title">
                  {activeTab === "pending" ? "No requests waiting" : `No ${activeTab} bookings`}
                </div>
                <div className="sa-empty__desc">
                  {activeTab === "pending" ? "Every booking request has an answer." : "Bookings you answer show up here."}
                </div>
              </div>
            ) : (
              <div className="sa-table-scroll">
                <table className="sa-table sa-inbox-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Booking</th>
                      <th>Status</th>
                      <th>Received</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((b) => {
                      const name = text(b.fields.name) || "—";
                      const contact = text(b.fields.email) || text(b.fields.phone);
                      const what = text(b.fields.booking_type) || text(b.fields.booking_item) || b.formId;
                      return (
                        <tr key={b.id}>
                          <td className="sa-table__mono">{b.id}</td>
                          <td>
                            <Link className="sa-inbox-name" href={`/admin/forms/${b.id}`}>{name}</Link>
                            {contact ? <div className="sa-table__secondary">{contact}</div> : null}
                          </td>
                          <td>
                            <strong>{formatWhen(b)}</strong>
                            <div className="sa-inbox-preview">{what}</div>
                          </td>
                          <td>
                            <span className={`sa-badge sa-booking-badge sa-booking-badge--${b.bookingStatus}`}>{b.bookingStatus}</span>
                          </td>
                          <td className="sa-table__date">{formatReceived(b.receivedAt)}</td>
                          <td className="sa-table__actions">
                            {b.bookingStatus === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="sa-btn sa-btn--primary sa-btn--sm"
                                  disabled={busy !== null}
                                  onClick={() => answer(b, "confirmed")}
                                >
                                  Confirm
                                </button>{" "}
                                <button
                                  type="button"
                                  className="sa-btn sa-btn--ghost sa-btn--sm"
                                  disabled={busy !== null}
                                  onClick={() => answer(b, "declined")}
                                >
                                  Decline
                                </button>{" "}
                              </>
                            ) : null}
                            <Link className="sa-btn sa-btn--ghost sa-btn--sm" href={`/admin/forms/${b.id}`}>Open</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
