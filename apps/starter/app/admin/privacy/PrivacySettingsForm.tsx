"use client";

import {
  FormEvent,
  useState,
} from "react";

type PrivacySettings = {
  cookieBannerEnabled: boolean;
  analyticsConsentEnabled: boolean;
  marketingConsentEnabled: boolean;
  consentVersion: string;
  bannerTitle: string;
  bannerDescription: string;
  privacyPolicyPath: string;
  cookiePolicyPath: string;
};

export default function PrivacySettingsForm({
  initial,
}: {
  initial: PrivacySettings;
}) {
  const [value, setValue] =
    useState(initial);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/privacy",
        {
          method: "PUT",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(value),
        },
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Could not save privacy settings.",
        );
      }

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

  return (
    <form
      className="sa-privacy-form"
      onSubmit={submit}
    >
      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Consent
          </p>

          <h2>Cookie banner</h2>

          <p className="sa-note">
            Control what visitors are asked
            to consent to.
          </p>
        </div>

        <label className="sa-privacy-toggle">
          <span>
            <strong>
              Enable cookie banner
            </strong>

            <small>
              Show consent choices to new
              visitors.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              value.cookieBannerEnabled
            }
            onChange={(event) =>
              setValue({
                ...value,
                cookieBannerEnabled:
                  event.target.checked,
              })
            }
          />
        </label>

        <label className="sa-privacy-toggle">
          <span>
            <strong>
              Analytics consent
            </strong>

            <small>
              Allows external analytics
              services after approval.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              value.analyticsConsentEnabled
            }
            onChange={(event) =>
              setValue({
                ...value,
                analyticsConsentEnabled:
                  event.target.checked,
              })
            }
          />
        </label>

        <label className="sa-privacy-toggle">
          <span>
            <strong>
              Marketing consent
            </strong>

            <small>
              Reserved for advertising and
              remarketing integrations.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              value.marketingConsentEnabled
            }
            onChange={(event) =>
              setValue({
                ...value,
                marketingConsentEnabled:
                  event.target.checked,
              })
            }
          />
        </label>
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Banner
          </p>

          <h2>Visitor message</h2>
        </div>

        <label className="sa-privacy-field">
          <span>Title</span>

          <input
            value={value.bannerTitle}
            maxLength={120}
            onChange={(event) =>
              setValue({
                ...value,
                bannerTitle:
                  event.target.value,
              })
            }
          />
        </label>

        <label className="sa-privacy-field">
          <span>Description</span>

          <textarea
            rows={5}
            maxLength={1000}
            value={
              value.bannerDescription
            }
            onChange={(event) =>
              setValue({
                ...value,
                bannerDescription:
                  event.target.value,
              })
            }
          />
        </label>
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Policies
          </p>

          <h2>Policy pages</h2>
        </div>

        <div className="sa-privacy-grid">
          <label className="sa-privacy-field">
            <span>
              Privacy policy path
            </span>

            <input
              value={
                value.privacyPolicyPath
              }
              onChange={(event) =>
                setValue({
                  ...value,
                  privacyPolicyPath:
                    event.target.value,
                })
              }
            />
          </label>

          <label className="sa-privacy-field">
            <span>
              Cookie policy path
            </span>

            <input
              value={
                value.cookiePolicyPath
              }
              onChange={(event) =>
                setValue({
                  ...value,
                  cookiePolicyPath:
                    event.target.value,
                })
              }
            />
          </label>
        </div>

        <label className="sa-privacy-field">
          <span>Consent version</span>

          <input
            value={
              value.consentVersion
            }
            maxLength={40}
            onChange={(event) =>
              setValue({
                ...value,
                consentVersion:
                  event.target.value,
              })
            }
          />

          <small>
            Change this value when your
            consent policy changes. Existing
            visitors will be asked again.
          </small>
        </label>
      </section>

      <div className="sa-privacy-actions">
        <button
          className="sa-btn sa-btn--primary"
          disabled={saving}
          type="submit"
        >
          {saving
            ? "Saving..."
            : "Save privacy settings"}
        </button>

        {message ? (
          <span>{message}</span>
        ) : null}
      </div>
    </form>
  );
}
