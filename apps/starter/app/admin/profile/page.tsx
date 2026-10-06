import {
  adminSessionExpiresAt,
  resolveAdminRole,
} from "@staark/platform/server";

import {
  getSession,
} from "@/lib/auth";

import ProfileSecurity from "./ProfileSecurity";

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
            Profile & security
          </h1>

          <p className="sa-subtitle">
            Technical sign-in information for this Staark Manager session.
          </p>
        </div>

        <span className="sa-topbar__pill">
          Staark Manager
        </span>
      </section>

      <div
        className="sa-card"
        style={{
          maxWidth:
            "900px",
        }}
      >
        <div className="sa-card__header">
          <div>
            <span className="sa-card__eyebrow">
              Manager identity
            </span>

            <h2>
              Recovery & platform access
            </h2>
          </div>
        </div>

        <dl
          style={{
            display:
              "grid",

            gap:
              "0",

            margin:
              0,
          }}
        >
          {[
            [
              "Account",
              session.username ??
                "manager",
            ],

            [
              "Account type",
              "Staark Manager",
            ],

            [
              "Authentication",
              recoveryMode
                ? "Recovery"
                : "Platform",
            ],

            [
              "Scope",
              "Platform",
            ],

            [
              "Two-factor authentication",
              recoveryMode
                ? "Required"
                : "Runtime policy",
            ],

            [
              "Credentials",
              "Runtime-managed",
            ],

            [
              "Session",
              `${formatRemaining(
                expiresAt,
              )} remaining`,
            ],
          ].map(
            (
              [
                label,
                value,
              ],
            ) => (
              <div
                key={
                  label
                }
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(180px, 260px) 1fr",

                  gap:
                    "24px",

                  padding:
                    "16px 0",

                  borderBottom:
                    "1px solid var(--sa-border, #dbe3ef)",
                }}
              >
                <dt
                  style={{
                    color:
                      "var(--sa-muted, #64748b)",
                  }}
                >
                  {label}
                </dt>

                <dd
                  style={{
                    margin:
                      0,

                    fontWeight:
                      600,
                  }}
                >
                  {value}
                </dd>
              </div>
            ),
          )}
        </dl>
      </div>

      <div
        className="sa-card"
        style={{
          maxWidth:
            "900px",

          marginTop:
            "20px",
        }}
      >
        <div className="sa-card__header">
          <div>
            <span className="sa-card__eyebrow">
              Security
            </span>

            <h2>
              Runtime-managed credentials
            </h2>
          </div>
        </div>

        <p className="sa-subtitle">
          Manager credentials are managed through the runtime environment and cannot be changed from a tenant admin.
        </p>

        {recoveryMode ? (
          <p className="sa-note">
            This session was created through database-independent Manager recovery authentication.
          </p>
        ) : null}
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
