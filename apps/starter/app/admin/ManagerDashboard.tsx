import Link from "next/link";
import type {
  ManagerDashboardData,
  ManagerHealthStatus,
} from "@/lib/admin-manager-dashboard";
import AdminIcon from "./AdminIcon";
import styles from "./manager-dashboard.module.css";

const ARROW =
  "M5 12h14 M13 6l6 6-6 6";

function formatDate(
  iso: string | null,
): string {
  if (!iso) return "None";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${date.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  )}, ${date.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function formatUptime(
  seconds: number,
): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days}d ${hours % 24}h`;
}

function healthLabel(
  status: ManagerHealthStatus,
): string {
  if (status === "ok") {
    return "Operational";
  }

  if (status === "warning") {
    return "Warnings";
  }

  if (status === "error") {
    return "Needs attention";
  }

  return "Unknown";
}

export default function ManagerDashboard({
  data,
  username,
}: {
  data: ManagerDashboardData;
  username: string;
}) {
  return (
    <>
      <section className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Staark Manager
          </p>

          <h1 className="sa-h1">
            Technical overview
          </h1>

          <p className="sa-subtitle">
            {data.site.name} · {username}
          </p>
        </div>

        <div className="sa-page-header__actions">
          {data.site.url ? (
            <a
              className="sa-btn sa-btn--ghost"
              href={data.site.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View website
            </a>
          ) : null}

          <Link
            className="sa-btn sa-btn--primary"
            href="/admin/health"
          >
            Site Health
          </Link>
        </div>
      </section>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">
            Site Health
          </div>

          <div className="sa-stat__value">
            {healthLabel(
              data.health.status,
            )}
          </div>

          <div className="sa-stat__desc">
            {data.health.errors} errors ·{" "}
            {data.health.warnings} warnings
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Content
          </div>

          <div className="sa-stat__value">
            {data.content.pages}
          </div>

          <div className="sa-stat__desc">
            pages · {data.content.media} media
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Last backup
          </div>

          <div
            className={`${styles.compactValue} sa-stat__value`}
          >
            {data.backup.lastAt
              ? formatDate(
                  data.backup.lastAt,
                )
              : "None"}
          </div>

          <div className="sa-stat__desc">
            Persistent recovery point
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Runtime
          </div>

          <div className="sa-stat__value">
            {data.deployment.environment}
          </div>

          <div className="sa-stat__desc">
            {data.deployment.nodeVersion} · uptime{" "}
            {formatUptime(
              data.deployment.uptimeSeconds,
            )}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Deployment
              </span>

              <h2>
                Runtime & storage
              </h2>
            </div>
          </div>

          <dl className={styles.details}>
            <div>
              <dt>Environment</dt>
              <dd>
                {data.deployment.environment}
              </dd>
            </div>

            <div>
              <dt>Content source</dt>
              <dd>
                {data.deployment.source}
              </dd>
            </div>

            <div>
              <dt>Content path</dt>
              <dd>
                <code>
                  {data.deployment.contentPrefix}
                </code>
              </dd>
            </div>

            <div>
              <dt>Website profile</dt>
              <dd>
                {data.site.websiteType}
              </dd>
            </div>

            <div>
              <dt>Node runtime</dt>
              <dd>
                {data.deployment.nodeVersion}
              </dd>
            </div>

            <div>
              <dt>Process uptime</dt>
              <dd>
                {formatUptime(
                  data.deployment.uptimeSeconds,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Design runtime
              </span>

              <h2>
                Theme
              </h2>
            </div>

            <Link href="/admin/themes">
              Open Themes{" "}
              <AdminIcon
                d={ARROW}
                size={16}
              />
            </Link>
          </div>

          <dl className={styles.details}>
            <div>
              <dt>Theme family</dt>
              <dd>
                {data.theme.family}
              </dd>
            </div>

            <div>
              <dt>Preset</dt>
              <dd>
                {data.theme.preset}
              </dd>
            </div>

            <div>
              <dt>Theme Studio</dt>
              <dd>
                {data.theme.studioName ||
                  data.theme.studioId ||
                  "Built-in"}
              </dd>
            </div>

            <div>
              <dt>Redirect rules</dt>
              <dd>
                {data.content.redirects}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className={`sa-card ${styles.healthCard}`}
        >
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Diagnostics
              </span>

              <h2>
                Site Health
              </h2>
            </div>

            <Link href="/admin/health">
              Full report{" "}
              <AdminIcon
                d={ARROW}
                size={16}
              />
            </Link>
          </div>

          <div className={styles.healthSummary}>
            <span
              className={`${styles.healthStatus} ${
                styles[
                  `health_${data.health.status}`
                ]
              }`}
            >
              {healthLabel(
                data.health.status,
              )}
            </span>

            <span>
              {data.health.passed} /{" "}
              {data.health.checks} checks passed
            </span>

            <span>
              Checked{" "}
              {formatDate(
                data.health.checkedAt,
              )}
            </span>
          </div>

          {data.health.items.length ? (
            <ul className={styles.healthList}>
              {data.health.items.map(
                (check) => (
                  <li key={check.id}>
                    <span>
                      <i
                        className={`${styles.dot} ${
                          styles[
                            `dot_${check.status}`
                          ]
                        }`}
                      />
                      {check.label}
                    </span>

                    <strong>
                      {check.issues
                        ? `${check.issues} issue${
                            check.issues === 1
                              ? ""
                              : "s"
                          }`
                        : "OK"}
                    </strong>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="sa-note">
              Health report is currently
              unavailable.
            </p>
          )}
        </section>

        <section className="sa-card">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">
                Operations
              </span>

              <h2>
                Technical actions
              </h2>
            </div>
          </div>

          <nav className={styles.actions}>
            <Link href="/admin/health">
              <strong>Site Health</strong>
              <span>
                Errors, warnings and diagnostics
              </span>
            </Link>

            <Link href="/admin/themes">
              <strong>Themes</strong>
              <span>
                Runtime design and presets
              </span>
            </Link>

            <Link href="/admin/backups">
              <strong>Backups</strong>
              <span>
                Restore and recovery
              </span>
            </Link>

            <Link href="/admin/redirects">
              <strong>Redirects</strong>
              <span>
                Inspect URL forwarding rules
              </span>
            </Link>
          </nav>

          <Link
            href="/admin/logs"
            className={styles.logsPlaceholder}
          >
            <div>
              <span className="sa-card__eyebrow">
                Logs
              </span>
              <strong>
                Application logs
              </strong>
            </div>

            <span>
              Open logs →
            </span>
          </Link>
        </section>
      </div>
    </>
  );
}
