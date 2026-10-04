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
  editable,
}: {
  initial: Configuration;
  analyticsConsentEnabled: boolean;
  dataApiConfigured: boolean;
  serviceAccountEmail: string | null;
  editable: boolean;
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
      <details className="sa-card sa-ga4-guide">
        <summary className="sa-ga4-guide__summary">
          <span>
            <span className="sa-card__eyebrow">
              Setup guide
            </span>

            <strong>
              How to connect Google Analytics 4
            </strong>

            <small>
              Measurement ID, Property ID and
              reporting access in a few steps.
            </small>
          </span>

          <span
            className="sa-ga4-guide__chevron"
            aria-hidden="true"
          >
            ↓
          </span>
        </summary>

        <div className="sa-ga4-guide__content">
          <ol className="sa-ga4-guide__steps">
            <li>
              <span className="sa-ga4-guide__number">
                1
              </span>

              <div>
                <strong>
                  Open Google Analytics
                </strong>

                <p>
                  Sign in to Google Analytics and
                  open the GA4 property for this
                  website. Create a GA4 property
                  first if the website does not
                  already have one.
                </p>
              </div>
            </li>

            <li>
              <span className="sa-ga4-guide__number">
                2
              </span>

              <div>
                <strong>
                  Copy the Measurement ID
                </strong>

                <p>
                  In Google Analytics, open
                  Admin → Data streams → Web and
                  select the website stream.
                </p>

                <p>
                  Copy the ID beginning with
                  <code>G-</code> and paste it
                  into Measurement ID above.
                </p>

                <div className="sa-ga4-guide__example">
                  Example:
                  <code>G-XXXXXXXXXX</code>
                </div>
              </div>
            </li>

            <li>
              <span className="sa-ga4-guide__number">
                3
              </span>

              <div>
                <strong>
                  Copy the Property ID
                </strong>

                <p>
                  Open Admin and select the same
                  GA4 property. Find its numeric
                  Property ID and paste it into
                  Property ID above.
                </p>

                <div className="sa-ga4-guide__example">
                  Example:
                  <code>123456789</code>
                </div>

                <p className="sa-note">
                  The Property ID is not the same
                  as the G- Measurement ID.
                </p>
              </div>
            </li>

            <li>
              <span className="sa-ga4-guide__number">
                4
              </span>

              <div>
                <strong>
                  Give Staark reporting access
                </strong>

                <p>
                  In Google Analytics, open
                  Admin → Property access
                  management → Add users.
                </p>

                <p>
                  Add the Staark service account
                  below and give it the
                  <strong> Viewer </strong>
                  role.
                </p>

                <div className="sa-ga4-guide__service-account">
                  <span>
                    Staark service account
                  </span>

                  <code>
                    {serviceAccountEmail ??
                      "Service account unavailable"}
                  </code>
                </div>

                <p className="sa-note">
                  Viewer access is enough. Staark
                  does not need Editor or
                  Administrator access.
                </p>
              </div>
            </li>

            <li>
              <span className="sa-ga4-guide__number">
                5
              </span>

              <div>
                <strong>
                  Test the reporting connection
                </strong>

                <p>
                  Return here and press
                  <strong> Test connection</strong>.
                  A successful connection will
                  show the timezone returned by
                  your GA4 property.
                </p>
              </div>
            </li>

            <li>
              <span className="sa-ga4-guide__number">
                6
              </span>

              <div>
                <strong>
                  Enable and save
                </strong>

                <p>
                  Enable Google Analytics, keep
                  analytics consent enabled, and
                  press
                  <strong> Save Google Analytics</strong>.
                </p>

                <p>
                  Staark will load the GA4 tag
                  only after the visitor accepts
                  Analytics cookies when consent
                  is required.
                </p>
              </div>
            </li>
          </ol>

          <div className="sa-ga4-guide__done">
            <strong>
              Done
            </strong>

            <span>
              Reporting data will then appear in
              the Analytics dashboard. New GA4
              properties may need some time before
              reports contain traffic data.
            </span>
          </div>
        </div>
      </details>
      {!editable ? (
        <section className="sa-analytics-google-warning">
          <strong>
            GA4 binding is managed by Staark
          </strong>

          <span>
            Your website can view its own Google Analytics connection,
            but Measurement ID and Property ID are locked to this tenant.
            Contact Staark if the GA4 property needs to be changed.
          </span>
        </section>
      ) : null}

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
            disabled={!editable}
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
            disabled={!editable}
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
            disabled={!editable}
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
            disabled={!editable}
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
              !editable ||
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
          disabled={
            !editable ||
            saving
          }
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
