"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InboxStatus =
  | "new"
  | "read"
  | "replied"
  | "archived";

type SubmissionKind =
  | "contact"
  | "lead"
  | "booking";

type Submission = {
  id: string;
  formId: string;
  kind: SubmissionKind;
  fields: Record<string, unknown>;
  pageUrl?: string;
  receivedAt: string;
  status: InboxStatus;
};

function text(value: unknown): string {
  return typeof value === "string" ||
    typeof value === "number"
    ? String(value).trim()
    : "";
}

function statusClass(
  status: InboxStatus,
): string {
  if (status === "new") {
    return "sa-status--unread";
  }

  if (status === "archived") {
    return "sa-status--pending";
  }

  return "sa-status--read";
}

function formatDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return (
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function requestText(
  fields: Record<string, unknown>,
): string {
  return (
    text(fields.message) ||
    text(fields.subject) ||
    text(fields.need) ||
    text(fields.service) ||
    text(fields.package) ||
    "Website enquiry"
  );
}

export default function FormsPage() {
  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          "/api/admin/forms",
        );

        const all: Submission[] =
          res.ok ? await res.json() : [];

        // Booking requests have their own business UI.
        // Legacy "lead" submissions are normal messages.
        setSubmissions(
          all.filter(
            (item) => item.kind !== "booking",
          ),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today =
    new Date().toDateString();

  const openCount = submissions.filter(
    (item) =>
      item.status === "new" ||
      item.status === "read",
  ).length;

  const todayCount = submissions.filter(
    (item) =>
      new Date(
        item.receivedAt,
      ).toDateString() === today,
  ).length;

  const formIds = new Set(
    submissions.map((item) => item.formId),
  ).size;

  if (loading) {
    return (
      <p className="sa-loading">
        Loading messages…
      </p>
    );
  }

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Business</span>
          <h1 className="sa-h1">Messages</h1>
          <p className="sa-subtitle">Read and reply to enquiries from your
        website.</p>
        </div>
      </section>

      <div className="sa-stats sa-stats--dashboard">
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Total
          </div>
          <div className="sa-stat__value">
            {submissions.length}
          </div>
          <div className="sa-stat__desc">
            Messages
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Open
          </div>
          <div className="sa-stat__value">
            {openCount}
          </div>
          <div className="sa-stat__desc">
            Need attention
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Today
          </div>
          <div className="sa-stat__value">
            {todayCount}
          </div>
          <div className="sa-stat__desc">
            Received today
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Forms
          </div>
          <div className="sa-stat__value">
            {formIds}
          </div>
          <div className="sa-stat__desc">
            Message sources
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__title">
              No messages yet
            </div>
            <div className="sa-empty__desc">
              Website enquiries will appear here.
            </div>
          </div>
        </div>
      ) : (
        <div className="sa-card sa-table-card">
          <div className="sa-table-scroll">
            <table className="sa-table sa-inbox-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>From</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {submissions.map((item) => {
                  const name =
                    text(item.fields.name) ||
                    "Customer";

                  const email =
                    text(item.fields.email);

                  const company =
                    text(item.fields.company);

                  return (
                    <tr key={item.id}>
                      <td className="sa-table__mono">
                        {item.id}
                      </td>

                      <td>
                        <Link
                          className="sa-inbox-name"
                          href={`/admin/forms/${item.id}`}
                        >
                          {name}
                        </Link>

                        {email ? (
                          <div className="sa-table__secondary">
                            {email}
                          </div>
                        ) : null}

                        {company ? (
                          <div className="sa-table__secondary">
                            {company}
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <div className="sa-inbox-preview">
                          {requestText(item.fields)}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`sa-status ${statusClass(
                            item.status,
                          )}`}
                        >
                          <span className="sa-status__dot" />
                          {item.status}
                        </span>
                      </td>

                      <td className="sa-table__date">
                        {formatDate(
                          item.receivedAt,
                        )}
                      </td>

                      <td className="sa-table__actions">
                        <Link
                          className="sa-btn sa-btn--ghost sa-btn--sm"
                          href={`/admin/forms/${item.id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
