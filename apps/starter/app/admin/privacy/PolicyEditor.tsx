"use client";

import {
  FormEvent,
  useState,
} from "react";

type PolicyType =
  | "privacyPolicy"
  | "cookiePolicy";

type PrivacySettings = Record<
  string,
  unknown
> & {
  privacyPolicy: {
    title: string;
    intro: string;
    personalData: string;
    purpose: string;
    analytics: string;
    rights: string;
  };

  cookiePolicy: {
    title: string;
    intro: string;
    necessary: string;
    analytics: string;
    marketing: string;
    choices: string;
  };
};

type Field = {
  key: string;
  label: string;
  help?: string;
};

const PRIVACY_FIELDS: Field[] = [
  {
    key: "intro",
    label: "Introduction",
  },
  {
    key: "personalData",
    label: "Personal data",
  },
  {
    key: "purpose",
    label: "Purpose",
  },
  {
    key: "analytics",
    label: "Analytics",
  },
  {
    key: "rights",
    label: "Visitor rights",
  },
];

const COOKIE_FIELDS: Field[] = [
  {
    key: "intro",
    label: "Introduction",
  },
  {
    key: "necessary",
    label: "Necessary storage",
  },
  {
    key: "analytics",
    label: "Analytics cookies",
  },
  {
    key: "marketing",
    label: "Marketing cookies",
  },
  {
    key: "choices",
    label: "Changing consent",
  },
];

export default function PolicyEditor({
  initial,
  type,
}: {
  initial: PrivacySettings;
  type: PolicyType;
}) {
  const [privacy, setPrivacy] =
    useState(initial);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const policy =
    privacy[type];

  const fields =
    type === "privacyPolicy"
      ? PRIVACY_FIELDS
      : COOKIE_FIELDS;

  function update(
    key: string,
    value: string,
  ) {
    setPrivacy((current) => ({
      ...current,

      [type]: {
        ...current[type],
        [key]: value,
      },
    }));
  }

  async function save(
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

          body: JSON.stringify(
            privacy,
          ),
        },
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Could not save policy.",
        );
      }

      setPrivacy(
        result.privacy,
      );

      setMessage("Saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save policy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="sa-privacy-form"
      onSubmit={save}
    >
      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Public policy
          </p>

          <h2>Page content</h2>

          <p className="sa-note">
            Changes are published directly
            on the public website.
          </p>
        </div>

        <label className="sa-privacy-field">
          <span>Page title</span>

          <input
            value={policy.title}
            maxLength={160}
            onChange={(event) =>
              update(
                "title",
                event.target.value,
              )
            }
          />
        </label>

        {fields.map((field) => (
          <label
            className="sa-privacy-field"
            key={field.key}
          >
            <span>
              {field.label}
            </span>

            <textarea
              rows={5}
              maxLength={5000}
              value={
                policy[
                  field.key as keyof typeof policy
                ] ?? ""
              }
              onChange={(event) =>
                update(
                  field.key,
                  event.target.value,
                )
              }
            />

            {field.help ? (
              <small>
                {field.help}
              </small>
            ) : null}
          </label>
        ))}
      </section>

      <div className="sa-privacy-actions">
        <button
          className="sa-btn sa-btn--primary"
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save policy"}
        </button>

        {message ? (
          <span>{message}</span>
        ) : null}
      </div>
    </form>
  );
}
