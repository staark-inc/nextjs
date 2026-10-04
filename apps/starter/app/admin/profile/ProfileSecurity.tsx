"use client";

import {
  useEffect,
  useState,
} from "react";

import styles from "./profile.module.css";

type Profile = {
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorEnabledAt:
    | string
    | null;
};

type Setup = {
  secret: string;
  qrDataUrl: string;
};

export default function ProfileSecurity() {
  const [profile, setProfile] =
    useState<Profile | null>(
      null,
    );

  const [name, setName] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    setupPassword,
    setSetupPassword,
  ] = useState("");

  const [
    setup,
    setSetup,
  ] =
    useState<Setup | null>(
      null,
    );

  const [
    verificationCode,
    setVerificationCode,
  ] = useState("");

  const [
    recoveryCodes,
    setRecoveryCodes,
  ] =
    useState<string[]>([]);

  const [
    disablePassword,
    setDisablePassword,
  ] = useState("");

  const [
    disableCode,
    setDisableCode,
  ] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [
    notice,
    setNotice,
  ] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(null);

  function flash(
    text: string,
    ok = true,
  ) {
    setNotice({
      ok,
      text,
    });
  }

  async function load() {
    const response =
      await fetch(
        "/api/admin/profile",
        {
          cache: "no-store",
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load account.",
      );
    }

    setProfile(
      data.profile,
    );

    setName(
      data.profile.name,
    );
  }

  useEffect(() => {
    void load().catch(
      (error) =>
        flash(
          error.message,
          false,
        ),
    );
  }, []);

  async function saveProfile() {
    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/profile",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                name,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      await load();
      flash(
        "Profile updated.",
      );
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not save profile.",
        false,
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (
      newPassword !==
      confirmPassword
    ) {
      flash(
        "New passwords do not match.",
        false,
      );
      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/profile/password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                currentPassword,
                newPassword,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      flash(
        "Password changed.",
      );
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not change password.",
        false,
      );
    } finally {
      setBusy(false);
    }
  }

  async function beginTwoFactor() {
    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/profile/2fa/setup",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                currentPassword:
                  setupPassword,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      setSetup({
        secret:
          data.secret,
        qrDataUrl:
          data.qrDataUrl,
      });

      setVerificationCode("");
      setRecoveryCodes([]);

      flash(
        "Scan the QR code, then verify a code from your authenticator.",
      );
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not start 2FA setup.",
        false,
      );
    } finally {
      setBusy(false);
    }
  }

  async function enableTwoFactor() {
    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/profile/2fa/enable",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                code:
                  verificationCode,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      setRecoveryCodes(
        data.recoveryCodes,
      );

      setSetup(null);
      setSetupPassword("");
      setVerificationCode("");

      await load();

      flash(
        "Two-factor authentication enabled.",
      );
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not enable 2FA.",
        false,
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableTwoFactor() {
    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/profile/2fa/disable",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                currentPassword:
                  disablePassword,
                code:
                  disableCode,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      setDisablePassword("");
      setDisableCode("");
      setRecoveryCodes([]);

      await load();

      flash(
        "Two-factor authentication disabled.",
      );
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not disable 2FA.",
        false,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <p className={styles.loading}>
        Loading account…
      </p>
    );
  }

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Account
          </p>

          <h1 className="sa-h1">
            Profile & security
          </h1>

          <p className="sa-subtitle">
            Manage your personal account, password and sign-in security.
          </p>
        </div>

        <span
          className={
            profile.twoFactorEnabled
              ? styles.securityOn
              : styles.securityOff
          }
        >
          {profile.twoFactorEnabled
            ? "2FA enabled"
            : "2FA not enabled"}
        </span>
      </div>

      {notice ? (
        <div
          className={
            notice.ok
              ? styles.noticeSuccess
              : styles.noticeError
          }
        >
          {notice.text}
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Profile
              </span>

              <h2>
                Personal details
              </h2>
            </div>
          </div>

          <div className={styles.fields}>
            <label>
              <span>Name</span>
              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Sign-in email
              </span>

              <input
                value={
                  profile.email
                }
                readOnly
                disabled
              />

              <small>
                Email changes require verification and are currently managed through Staark support.
              </small>
            </label>
          </div>

          <div className={styles.actions}>
            <button
              className="sa-btn sa-btn--primary"
              onClick={
                saveProfile
              }
              disabled={busy}
            >
              Save profile
            </button>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Password
              </span>

              <h2>
                Change password
              </h2>
            </div>
          </div>

          <div className={styles.fields}>
            <label>
              <span>
                Current password
              </span>

              <input
                type="password"
                autoComplete="current-password"
                value={
                  currentPassword
                }
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                New password
              </span>

              <input
                type="password"
                autoComplete="new-password"
                value={
                  newPassword
                }
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
              />

              <small>
                12–128 characters.
              </small>
            </label>

            <label>
              <span>
                Confirm new password
              </span>

              <input
                type="password"
                autoComplete="new-password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              className="sa-btn sa-btn--primary"
              onClick={
                changePassword
              }
              disabled={
                busy ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              Change password
            </button>
          </div>
        </section>
      </div>

      <section className={`sa-card ${styles.twoFactor}`}>
        <div className="sa-card__header">
          <div>
            <span className="sa-card__eyebrow">
              Security
            </span>

            <h2>
              Two-factor authentication
            </h2>

            <p className="sa-subtitle">
              Protect your account with an authenticator app.
            </p>
          </div>
        </div>

        {!profile.twoFactorEnabled ? (
          <>
            {!setup ? (
              <div className={styles.twoFactorStart}>
                <div>
                  <strong>
                    Add an extra layer of protection
                  </strong>

                  <p>
                    After enabling 2FA, your password alone will no longer be enough to sign in.
                  </p>
                </div>

                <div className={styles.inlineForm}>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={
                      setupPassword
                    }
                    onChange={(event) =>
                      setSetupPassword(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    className="sa-btn sa-btn--primary"
                    onClick={
                      beginTwoFactor
                    }
                    disabled={
                      busy ||
                      !setupPassword
                    }
                  >
                    Set up 2FA
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.setupGrid}>
                <div className={styles.qr}>
                  <img
                    src={
                      setup.qrDataUrl
                    }
                    alt="Authenticator QR code"
                  />
                </div>

                <div className={styles.setupInstructions}>
                  <strong>
                    1. Scan the QR code
                  </strong>

                  <p>
                    Open your authenticator app and add a new account.
                  </p>

                  <div className={styles.manualSecret}>
                    <span>
                      Manual setup key
                    </span>

                    <code>
                      {setup.secret}
                    </code>
                  </div>

                  <strong>
                    2. Verify setup
                  </strong>

                  <div className={styles.inlineForm}>
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      value={
                        verificationCode
                      }
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value,
                        )
                      }
                    />

                    <button
                      className="sa-btn sa-btn--primary"
                      onClick={
                        enableTwoFactor
                      }
                      disabled={
                        busy ||
                        !verificationCode
                      }
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.enabled}>
            <div>
              <strong>
                Two-factor authentication is active
              </strong>

              <p>
                Your authenticator code is required when signing in.
              </p>
            </div>

            <div className={styles.disableForm}>
              <input
                type="password"
                placeholder="Current password"
                value={
                  disablePassword
                }
                onChange={(event) =>
                  setDisablePassword(
                    event.target.value,
                  )
                }
              />

              <input
                inputMode="numeric"
                placeholder="Authenticator code"
                value={
                  disableCode
                }
                onChange={(event) =>
                  setDisableCode(
                    event.target.value,
                  )
                }
              />

              <button
                className="sa-btn sa-btn--danger"
                onClick={
                  disableTwoFactor
                }
                disabled={
                  busy ||
                  !disablePassword ||
                  !disableCode
                }
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}

        {recoveryCodes.length ? (
          <div className={styles.recovery}>
            <strong>
              Save your recovery codes now
            </strong>

            <p>
              Each code can be used once if you lose access to your authenticator. They will not be shown again.
            </p>

            <div className={styles.recoveryGrid}>
              {recoveryCodes.map(
                (code) => (
                  <code key={code}>
                    {code}
                  </code>
                ),
              )}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
