"use client";

import { useState } from "react";

export default function SearchConsoleForm({
  initialSiteUrl,
  initialEnabled,
  clientEmail,
}: {
  initialSiteUrl: string;
  initialEnabled: boolean;
  clientEmail: string | null;
}) {
  const [siteUrl, setSiteUrl] =
    useState(initialSiteUrl);

  const [enabled, setEnabled] =
    useState(initialEnabled);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);

    const response =
      await fetch(
        "/api/admin/search-console",
        {
          method: "PUT",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            siteUrl,
            enabled,
          }),
        },
      );

    const data =
      await response
        .json()
        .catch(() => ({})) as {
        error?: string;
        permissionLevel?: string | null;
      };

    setSaving(false);

    if (!response.ok) {
      setMessage({
        ok: false,
        text:
          data.error ??
          "Could not connect Search Console.",
      });
      return;
    }

    setMessage({
      ok: true,
      text:
        `Search Console connected${
          data.permissionLevel
            ? ` · ${data.permissionLevel}`
            : ""
        }.`,
    });
  }

  return (
    <section className="sa-card">
      <div className="sa-card__header">
        <p className="sa-card__eyebrow">
          Connection
        </p>

        <h2>
          Google Search Console
        </h2>

        <p>
          Add the exact property identifier
          from Search Console.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <div className="sa-field">
          <label htmlFor="gsc-site-url">
            Property
          </label>

          <input
            id="gsc-site-url"
            value={siteUrl}
            onChange={(event) =>
              setSiteUrl(
                event.target.value,
              )
            }
            placeholder="sc-domain:example.com"
          />

          <div className="sa-field-hint">
            Examples:
            {" "}
            sc-domain:example.com
            {" "}
            or
            {" "}
            https://example.com/
          </div>
        </div>

        <label className="sa-check-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              setEnabled(
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Enable Search Console
            </strong>

            <small>
              Load organic Google search
              performance for this site.
            </small>
          </span>
        </label>

        {clientEmail ? (
          <div className="sa-note">
            Google service account:
            {" "}
            <strong>
              {clientEmail}
            </strong>
          </div>
        ) : null}

        <div>
          <button
            className="sa-btn sa-btn--primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving
              ? "Connecting…"
              : "Connect & verify"}
          </button>
        </div>

        {message ? (
          <div
            className={
              message.ok
                ? "sa-plan-status sa-plan-status--success"
                : "sa-analytics-google-warning"
            }
          >
            {message.text}
          </div>
        ) : null}
      </div>
    </section>
  );
}
