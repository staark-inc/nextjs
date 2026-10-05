"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

type Verification = {
  fileName: string | null;
  contentType: string | null;
  uploadedAt: string | null;
};

function propertyType(
  siteUrl: string,
): "domain" | "url-prefix" | "unknown" {
  const value =
    siteUrl.trim();

  if (
    value.startsWith(
      "sc-domain:",
    )
  ) {
    return "domain";
  }

  try {
    const url =
      new URL(
        value,
      );

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return "url-prefix";
    }
  } catch {
    // Invalid/incomplete property while the user types.
  }

  return "unknown";
}

function publicVerificationUrl(
  siteUrl: string,
  fileName: string | null,
): string | null {
  if (
    !fileName ||
    propertyType(
      siteUrl,
    ) !== "url-prefix"
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        siteUrl,
      );

    url.pathname =
      `/${fileName}`;

    url.search =
      "";

    url.hash =
      "";

    return url.toString();
  } catch {
    return null;
  }
}

export default function SearchConsoleForm({
  initialSiteUrl,
  initialEnabled,
  clientEmail,
  initialVerification,
}: {
  initialSiteUrl: string;
  initialEnabled: boolean;
  clientEmail: string | null;
  initialVerification: Verification;
}) {
  const [
    siteUrl,
    setSiteUrl,
  ] =
    useState(
      initialSiteUrl,
    );

  const [
    enabled,
    setEnabled,
  ] =
    useState(
      initialEnabled,
    );

  const [
    verification,
    setVerification,
  ] =
    useState<Verification>(
      initialVerification,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    uploading,
    setUploading,
  ] =
    useState(
      false,
    );

  const [
    deleting,
    setDeleting,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(
      null,
    );

  const [
    verificationMessage,
    setVerificationMessage,
  ] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(
      null,
    );

  const fileInput =
    useRef<HTMLInputElement>(
      null,
    );

  const type =
    propertyType(
      siteUrl,
    );

  const verificationUrl =
    useMemo(
      () =>
        publicVerificationUrl(
          siteUrl,
          verification.fileName,
        ),
      [
        siteUrl,
        verification.fileName,
      ],
    );

  async function save() {
    setSaving(
      true,
    );

    setMessage(
      null,
    );

    const response =
      await fetch(
        "/api/admin/search-console",
        {
          method:
            "PUT",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              siteUrl,
              enabled,
            }),
        },
      );

    const data =
      await response
        .json()
        .catch(
          () => ({}),
        ) as {
        error?: string;
        permissionLevel?:
          string | null;
      };

    setSaving(
      false,
    );

    if (!response.ok) {
      setMessage({
        ok:
          false,

        text:
          data.error ??
          "Could not connect Search Console.",
      });

      return;
    }

    setMessage({
      ok:
        true,

      text:
        `Search Console connected${
          data.permissionLevel
            ? ` · ${data.permissionLevel}`
            : ""
        }.`,
    });
  }

  async function uploadVerification(
    file: File,
  ) {
    setUploading(
      true,
    );

    setVerificationMessage(
      null,
    );

    try {
      const body =
        new FormData();

      body.set(
        "siteUrl",
        siteUrl,
      );

      body.set(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/search-console/verification",
          {
            method:
              "POST",

            body,
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          ) as {
          error?: string;

          binding?: {
            verification?: Verification;
          };

          verificationUrl?:
            string | null;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Could not upload verification file.",
        );
      }

      if (
        data.binding
          ?.verification
      ) {
        setVerification(
          data.binding
            .verification,
        );
      }

      setVerificationMessage({
        ok:
          true,

        text:
          data.verificationUrl
            ? "Verification file is live on this website."
            : "Verification file saved.",
      });
    } catch (error) {
      setVerificationMessage({
        ok:
          false,

        text:
          error instanceof Error
            ? error.message
            : "Could not upload verification file.",
      });
    } finally {
      setUploading(
        false,
      );

      if (
        fileInput.current
      ) {
        fileInput.current.value =
          "";
      }
    }
  }

  async function deleteVerification() {
    if (
      !window.confirm(
        "Remove this Google verification file from the website?",
      )
    ) {
      return;
    }

    setDeleting(
      true,
    );

    setVerificationMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/admin/search-console/verification",
          {
            method:
              "DELETE",
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          ) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Could not remove verification file.",
        );
      }

      setVerification({
        fileName:
          null,

        contentType:
          null,

        uploadedAt:
          null,
      });

      setVerificationMessage({
        ok:
          true,

        text:
          "Verification file removed.",
      });
    } catch (error) {
      setVerificationMessage({
        ok:
          false,

        text:
          error instanceof Error
            ? error.message
            : "Could not remove verification file.",
      });
    } finally {
      setDeleting(
        false,
      );
    }
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
          Connect this website to its own
          Search Console property.
        </p>
      </div>

      <div
        style={{
          display:
            "grid",

          gap:
            20,
        }}
      >
        <div className="sa-field">
          <label htmlFor="gsc-site-url">
            Property
          </label>

          <input
            id="gsc-site-url"
            value={
              siteUrl
            }
            onChange={
              (event) =>
                setSiteUrl(
                  event.target.value,
                )
            }
            placeholder="https://example.com/"
          />

          <div className="sa-field-hint">
            URL-prefix:
            {" "}
            https://example.com/
            {" · "}
            Domain property:
            {" "}
            sc-domain:example.com
          </div>
        </div>

        <div
          style={{
            padding:
              16,

            border:
              "1px solid var(--sa-line)",

            borderRadius:
              12,

            display:
              "grid",

            gap:
              14,
          }}
        >
          <div>
            <strong>
              Search Console verification
            </strong>

            <div className="sa-field-hint">
              Verification belongs only to
              this website tenant.
            </div>
          </div>

          {type ===
          "domain" ? (
            <div className="sa-note">
              <strong>
                DNS verification required
              </strong>

              <br />

              This is a Domain property.
              Add the TXT verification record
              provided by Google to the domain&apos;s
              DNS settings. HTML file verification
              is not used for
              <code>
                {" "}
                sc-domain:
              </code>
              properties.
            </div>
          ) : null}

          {type ===
          "url-prefix" ? (
            <>
              <div className="sa-field">
                <label htmlFor="gsc-verification-file">
                  Google HTML verification file
                </label>

                <input
                  ref={
                    fileInput
                  }
                  id="gsc-verification-file"
                  type="file"
                  accept=".html,text/html,text/plain"
                  disabled={
                    uploading
                  }
                  onChange={
                    (event) => {
                      const file =
                        event
                          .target
                          .files?.[0];

                      if (file) {
                        void uploadVerification(
                          file,
                        );
                      }
                    }
                  }
                />

                <div className="sa-field-hint">
                  Upload the original
                  googleXXXXXXXX.html file downloaded
                  from Google Search Console.
                </div>
              </div>

              {verification.fileName ? (
                <div className="sa-note">
                  <div>
                    <strong>
                      {
                        verification.fileName
                      }
                    </strong>
                  </div>

                  {verification.uploadedAt ? (
                    <div>
                      Uploaded
                      {" "}
                      {new Date(
                        verification.uploadedAt,
                      ).toLocaleString()}
                    </div>
                  ) : null}

                  {verificationUrl ? (
                    <div
                      style={{
                        marginTop:
                          8,
                      }}
                    >
                      <a
                        href={
                          verificationUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open public verification file ↗
                      </a>
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop:
                        10,
                    }}
                  >
                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost sa-btn--sm"
                      disabled={
                        deleting
                      }
                      onClick={
                        () =>
                          void deleteVerification()
                      }
                    >
                      {deleting
                        ? "Removing…"
                        : "Remove verification file"}
                    </button>
                  </div>
                </div>
              ) : null}

              {uploading ? (
                <div className="sa-note">
                  Uploading and validating
                  Google verification file…
                </div>
              ) : null}
            </>
          ) : null}

          {type ===
          "unknown" ? (
            <div className="sa-note">
              Enter the Search Console property
              above to choose the correct
              verification method.
            </div>
          ) : null}

          {verificationMessage ? (
            <div
              className={
                verificationMessage.ok
                  ? "sa-plan-status sa-plan-status--success"
                  : "sa-analytics-google-warning"
              }
            >
              {
                verificationMessage.text
              }
            </div>
          ) : null}
        </div>

        <label className="sa-check-row">
          <input
            type="checkbox"
            checked={
              enabled
            }
            onChange={
              (event) =>
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
            After the property is verified,
            give this Google service account
            access to the Search Console
            property:
            {" "}

            <strong>
              {clientEmail}
            </strong>
          </div>
        ) : null}

        <div>
          <button
            className="sa-btn sa-btn--primary"
            onClick={
              () =>
                void save()
            }
            disabled={
              saving
            }
          >
            {saving
              ? "Checking…"
              : "Connect & verify access"}
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
            {
              message.text
            }
          </div>
        ) : null}
      </div>
    </section>
  );
}
