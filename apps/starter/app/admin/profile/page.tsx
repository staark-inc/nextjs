import {
  adminSessionExpiresAt,
  resolveAdminRole,
} from "@staark/platform/server";

import {
  getSession,
} from "@/lib/auth";

import ProfileSecurity from "./ProfileSecurity";
import styles from "./profile.module.css";

export const dynamic =
  "force-dynamic";

function formatRemaining(
  expiresAt: number | null,
): string {
  if (!expiresAt) {
    return "Unknown";
  }

  const remaining =
    Math.max(
      0,
      expiresAt -
        Date.now(),
    );

  const minutes =
    Math.floor(
      remaining /
        60_000,
    );

  const hours =
    Math.floor(
      minutes /
        60,
    );

  const restMinutes =
    minutes %
    60;

  if (hours > 0) {
    return `${hours}h ${restMinutes}m`;
  }

  return `${restMinutes}m`;
}

async function ManagerProfile() {
  const session =
    await getSession();

  const expiresAt =
    adminSessionExpiresAt(
      session,
    );

  const recoveryMode =
    session.recoveryMode ===
    true;

  return (
    <>
      <section className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Account
          </p>

          <h1 className="sa-h1">
            Manager account
          </h1>

          <p className="sa-subtitle">
            Your Staark Manager sign-in and security status.
          </p>
        </div>
      </section>

      <div className={styles.managerGrid}>
        <section className="sa-card">
          <div className={styles.managerIdentity}>
            <div className={styles.managerAvatar}>
              M
            </div>

            <div>
              <span className="sa-card__eyebrow">
                Staark Manager
              </span>

              <h2>
                {session.username ??
                  "Manager"}
              </h2>

              <p>
                Platform-level support access for this tenant.
              </p>
            </div>
          </div>

          <div className={styles.managerStatus}>
            <div>
              <span>
                Sign-in
              </span>

              <strong>
                {recoveryMode
                  ? "Recovery access"
                  : "Platform access"}
              </strong>
            </div>

            <div>
              <span>
                Two-factor authentication
              </span>

              <strong>
                {recoveryMode
                  ? "Required"
                  : "Enabled by policy"}
              </strong>
            </div>

            <div>
              <span>
                Session
              </span>

              <strong>
                {formatRemaining(
                  expiresAt,
                )}{" "}
                remaining
              </strong>
            </div>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Security
              </span>

              <h2>
                Centrally managed
              </h2>
            </div>
          </div>

          <div className={styles.managerSecurity}>
            <div className={styles.managerSecurityIcon}>
              ✓
            </div>

            <div>
              <strong>
                Manager credentials are protected outside the tenant database.
              </strong>

              <p>
                Password and authenticator settings are managed through the Staark runtime and cannot be changed from this tenant admin.
              </p>

              {recoveryMode ? (
                <small>
                  This session was created using database-independent Manager recovery access.
                </small>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default async function ProfilePage() {
  const session =
    await getSession();

  const role =
    resolveAdminRole(
      session.role,
    );

  if (
    role ===
    "manager"
  ) {
    return (
      <ManagerProfile />
    );
  }

  return (
    <ProfileSecurity />
  );
}
