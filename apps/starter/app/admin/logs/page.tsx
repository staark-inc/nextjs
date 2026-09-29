import Link from "next/link";
import {
  listAdminLogs,
} from "@/lib/admin-logs";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
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
      second: "2-digit",
    },
  )}`;
}

export default async function LogsPage() {
  const logs = await listAdminLogs(250);

  const counts = {
    errors: logs.filter(
      (item) => item.level === "error",
    ).length,

    warnings: logs.filter(
      (item) => item.level === "warning",
    ).length,

    info: logs.filter(
      (item) => item.level === "info",
    ).length,
  };

  return (
    <>
      <div className="sa-breadcrumb">
        <Link href="/admin">
          Dashboard
        </Link>
        <span>/</span>
        <span>Logs</span>
      </div>

      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            System
          </p>

          <h1 className="sa-h1">
            Application logs
          </h1>

          <p className="sa-subtitle">
            Technical events recorded by this
            Staark installation.
          </p>
        </div>

        <div className="sa-page-header__actions">
          <Link
            className="sa-btn sa-btn--ghost"
            href="/admin/health"
          >
            Site Health
          </Link>
        </div>
      </div>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">
            Recorded
          </div>
          <div className="sa-stat__value">
            {logs.length}
          </div>
          <div className="sa-stat__desc">
            Latest events
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Errors
          </div>
          <div className="sa-stat__value">
            {counts.errors}
          </div>
          <div className="sa-stat__desc">
            Need attention
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Warnings
          </div>
          <div className="sa-stat__value">
            {counts.warnings}
          </div>
          <div className="sa-stat__desc">
            Review recommended
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Info
          </div>
          <div className="sa-stat__value">
            {counts.info}
          </div>
          <div className="sa-stat__desc">
            Normal activity
          </div>
        </div>
      </div>

      <section className="sa-card sa-table-card">
        {logs.length ? (
          <div className="sa-table-scroll">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Area</th>
                  <th>Event</th>
                  <th>Message</th>
                  <th>Actor</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="sa-table__date">
                      {formatDate(log.at)}
                    </td>

                    <td>
                      <span
                        className={`${styles.level} ${
                          styles[
                            `level_${log.level}`
                          ]
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>

                    <td>
                      <code>{log.area}</code>
                    </td>

                    <td>
                      <strong>
                        {log.action}
                      </strong>
                    </td>

                    <td>
                      <div className={styles.message}>
                        {log.message}

                        {log.meta ? (
                          <details>
                            <summary>
                              Details
                            </summary>

                            <pre>
                              {JSON.stringify(
                                log.meta,
                                null,
                                2,
                              )}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      {log.actor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">
              No technical events yet
            </div>

            <div className="sa-empty__desc">
              Theme changes, backups and system
              operations will appear here.
            </div>
          </div>
        )}
      </section>
    </>
  );
}
