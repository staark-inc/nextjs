"use client";

import {
  FormEvent,
  useState,
} from "react";

type Configuration = {
  enabled: boolean;
  measurementId?: string;
  propertyId?: string;
  consentRequired: boolean;
};

export default function GoogleAnalyticsForm({
  initial,
  analyticsConsentEnabled,
  dataApiConfigured,
  serviceAccountEmail,
}: {
  initial: Configuration;
  analyticsConsentEnabled: boolean;
  dataApiConfigured: boolean;
  serviceAccountEmail: string | null;
}) {
  const [value, setValue] =
    useState(initial);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [testing, setTesting] =
    useState(false);

  const [testMessage, setTestMessage] =
    useState("");

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/analytics/google",
          {
            method: "PUT",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              ...value,

              measurementId:
                value.measurementId
                  ?.trim()
                  .toUpperCase() ||
                undefined,
            }),
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Could not save Google Analytics settings.",
        );
      }

      setValue(
        result.googleAnalytics,
      );

      setMessage("Saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/analytics/google/test",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                propertyId:
                  value.propertyId
                    ?.trim(),
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Connection test failed.",
        );
      }

      setTestMessage(
        result.timeZone
          ? `Connected · ${result.timeZone}`
          : "Connected successfully.",
      );
    } catch (error) {
      setTestMessage(
        error instanceof Error
          ? error.message
          : "Connection test failed.",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="sa-privacy-form"
      onSubmit={submit}
    >
      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Google Analytics 4
          </p>

          <h2>Tracking configuration</h2>

          <p className="sa-note">
            Each customer website uses its
            own GA4 Measurement ID.
          </p>
        </div>

        <label className="sa-privacy-toggle">
          <span>
            <strong>
              Enable Google Analytics
            </strong>

            <small>
              Load GA4 only when this
              integration is enabled.
            </small>
          </span>

          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) =>
              setValue({
                ...value,
                enabled:
                  event.target.checked,
              })
            }
          />
        </label>

        <label className="sa-privacy-field">
          <span>Measurement ID</span>

          <input
            value={
              value.measurementId ?? ""
            }
            placeholder="G-XXXXXXXXXX"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(event) =>
              setValue({
                ...value,
                measurementId:
                  event.target.value,
              })
            }
          />

          <small>
            Found in your Google Analytics
            web data stream.
          </small>
        </label>

        <label className="sa-privacy-field">
          <span>Property ID</span>

          <input
            value={
              value.propertyId ?? ""
            }
            placeholder="123456789"
            inputMode="numeric"
            spellCheck={false}
            onChange={(event) =>
              setValue({
                ...value,

                propertyId:
                  event.target.value
                    .replace(
                      /[^0-9]/g,
                      "",
                    ),
              })
            }
          />

          <small>
            Numeric GA4 Property ID used by
            the Analytics Data API.
          </small>
        </label>

        <label className="sa-privacy-toggle">
          <span>
            <strong>
              Require analytics consent
            </strong>

            <small>
              GA4 will not be loaded until
              the visitor accepts Analytics.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              value.consentRequired
            }
            onChange={(event) =>
              setValue({
                ...value,
                consentRequired:
                  event.target.checked,
              })
            }
          />
        </label>
      </section>

      {!analyticsConsentEnabled ? (
        <section className="sa-analytics-google-warning">
          <strong>
            Analytics consent is disabled
          </strong>

          <span>
            Enable Analytics consent under
            Privacy & consent before turning
            on consent-aware GA4 tracking.
          </span>

          <a href="/admin/privacy">
            Open Privacy & consent →
          </a>
        </section>
      ) : null}

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Analytics Data API
          </p>

          <h2>Reporting connection</h2>

          <p className="sa-note">
            Grant this service account Viewer
            access to the GA4 property, then
            test the Property ID.
          </p>
        </div>

        <div className="sa-analytics-data-api">
          <div>
            <span>Runtime credentials</span>

            <strong>
              {dataApiConfigured
                ? "Configured"
                : "Not configured"}
            </strong>
          </div>

          <div>
            <span>Service account</span>

            <strong>
              {serviceAccountEmail ??
                "Unavailable"}
            </strong>
          </div>
        </div>

        <div className="sa-analytics-test-row">
          <button
            className="sa-btn"
            type="button"
            disabled={
              testing ||
              !value.propertyId
            }
            onClick={
              testConnection
            }
          >
            {testing
              ? "Testing..."
              : "Test connection"}
          </button>

          {testMessage ? (
            <span>
              {testMessage}
            </span>
          ) : null}
        </div>
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Consent Mode
          </p>

          <h2>Visitor privacy</h2>
        </div>

        <div className="sa-analytics-google-state">
          <div>
            <span>
              Default analytics storage
            </span>
            <strong>Denied</strong>
          </div>

          <div>
            <span>
              After Analytics consent
            </span>
            <strong>Granted</strong>
          </div>

          <div>
            <span>
              Staark Analytics
            </span>
            <strong>
              Cookie-free
            </strong>
          </div>
        </div>
      </section>

      <div className="sa-privacy-actions">
        <button
          className="sa-btn sa-btn--primary"
          disabled={saving}
          type="submit"
        >
          {saving
            ? "Saving..."
            : "Save Google Analytics"}
        </button>

        {message ? (
          <span>{message}</span>
        ) : null}
      </div>
    </form>
  );
}
