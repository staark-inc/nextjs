import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  getSession,
  isSessionActive,
} from "@/lib/auth";

import {
  getAdminLogStats,
  listAdminLogAreas,
  listAdminLogs,
  type AdminLogLevel,
} from "@/lib/admin-logs";

import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<
    Record<
      string,
      string |
      string[] |
      undefined
    >
  >;

const LEVELS:
  AdminLogLevel[] = [
    "critical",
    "error",
    "warning",
    "info",
    "debug",
  ];

function firstValue(
  value:
    | string
    | string[]
    | undefined,
): string {
  if (
    Array.isArray(value)
  ) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function validLevel(
  value: string,
): AdminLogLevel | undefined {
  return LEVELS.includes(
    value as AdminLogLevel,
  )
    ? value as AdminLogLevel
    : undefined;
}

function formatDate(
  iso: string,
): string {
  const date =
    new Date(iso);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function exportHref(
  params: {
    level?: string;
    area?: string;
    q?: string;
    from?: string;
    to?: string;
  },
): string {
  const search =
    new URLSearchParams();

  for (
    const [key, value]
    of Object.entries(
      params,
    )
  ) {
    if (
      value?.trim()
    ) {
      search.set(
        key,
        value.trim(),
      );
    }
  }

  const query =
    search.toString();

  return query
    ? `/api/admin/logs/export?${query}`
    : "/api/admin/logs/export";
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session =
    await getSession();

  if (
    !isSessionActive(
      session,
    )
  ) {
    redirect(
      "/admin/login",
    );
  }

  /*
   * Logs are an operational Manager feature.
   * Client users should not be able to open
   * the page by manually entering the URL.
   */
  if (
    session.role !==
    "manager"
  ) {
    redirect(
      "/admin",
    );
  }

  const raw =
    await searchParams;

  const level =
    validLevel(
      firstValue(
        raw.level,
      ),
    );

  const area =
    firstValue(
      raw.area,
    ).trim();

  const search =
    firstValue(
      raw.q,
    ).trim();

  const from =
    firstValue(
      raw.from,
    ).trim();

  const to =
    firstValue(
      raw.to,
    ).trim();

  const [
    logs,
    stats,
    areas,
  ] =
    await Promise.all([
      listAdminLogs({
        limit: 250,
        ...(level
          ? { level }
          : {}),
        ...(area
          ? { area }
          : {}),
        ...(search
          ? {
              search,
            }
          : {}),
        ...(from
          ? { from }
          : {}),
        ...(to
          ? { to }
          : {}),
      }),

      getAdminLogStats({
        ...(from
          ? { from }
          : {}),
        ...(to
          ? { to }
          : {}),
      }),

      listAdminLogAreas(),
    ]);

  const filtered =
    Boolean(
      level ||
      area ||
      search ||
      from ||
      to,
    );

  const exportUrl =
    exportHref({
      level,
      area,
      q: search,
      from,
      to,
    });

  return (
    <>
      <div className="sa-breadcrumb">
        <Link href="/admin">
          Dashboard
        </Link>

        <span>/</span>

        <span>
          Logs
        </span>
      </div>

      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Diagnostics
          </p>

          <h1 className="sa-h1">
            Manager logs
          </h1>

          <p className="sa-subtitle">
            Storage-backed technical events for
            this tenant. Available independently
            of the database.
          </p>
        </div>

        <div className="sa-page-header__actions">
          <a
            className="sa-btn sa-btn--ghost"
            href={exportUrl}
          >
            Export JSONL
          </a>

          <Link
            className="sa-btn sa-btn--ghost"
            href="/admin/health"
          >
            Site Health
          </Link>
        </div>
      </div>

      <div
        className={`${styles.stats} sa-stats`}
      >
        <div className="sa-stat">
          <div className="sa-stat__label">
            Recorded
          </div>

          <div className="sa-stat__value">
            {stats.entries}
          </div>

          <div className="sa-stat__desc">
            Stored events
          </div>
        </div>

        <div className={styles.criticalStat}>
          <div className="sa-stat__label">
            Critical
          </div>

          <div className="sa-stat__value">
            {stats.critical}
          </div>

          <div className="sa-stat__desc">
            Immediate attention
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Errors
          </div>

          <div className="sa-stat__value">
            {stats.errors}
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
            {stats.warnings}
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
            {stats.info + stats.debug}
          </div>

          <div className="sa-stat__desc">
            Normal activity
          </div>
        </div>
      </div>

      {stats.malformedLines > 0 ? (
        <div className={styles.integrityWarning}>
          <strong>
            Storage warning
          </strong>

          <span>
            {stats.malformedLines} malformed
            JSONL line
            {stats.malformedLines === 1
              ? ""
              : "s"}{" "}
            were ignored while reading the log
            archive.
          </span>
        </div>
      ) : null}

      <section
        className={`${styles.filters} sa-card`}
      >
        <form
          className={styles.filterForm}
          method="get"
        >
          <div className={styles.searchField}>
            <label htmlFor="log-search">
              Search
            </label>

            <input
              id="log-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Message, event, actor..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="log-level">
              Level
            </label>

            <select
              id="log-level"
              name="level"
              defaultValue={level ?? ""}
            >
              <option value="">
                All levels
              </option>

              {LEVELS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="log-area">
              Area
            </label>

            <select
              id="log-area"
              name="area"
              defaultValue={area}
            >
              <option value="">
                All areas
              </option>

              {areas.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="log-from">
              From
            </label>

            <input
              id="log-from"
              name="from"
              type="date"
              defaultValue={from}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="log-to">
              To
            </label>

            <input
              id="log-to"
              name="to"
              type="date"
              defaultValue={to}
            />
          </div>

          <div className={styles.filterActions}>
            <button
              className="sa-btn sa-btn--primary"
              type="submit"
            >
              Apply filters
            </button>

            {filtered ? (
              <Link
                className="sa-btn sa-btn--ghost"
                href="/admin/logs"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        <div className={styles.filterMeta}>
          <span>
            Showing{" "}
            <strong>
              {logs.length}
            </strong>{" "}
            event
            {logs.length === 1
              ? ""
              : "s"}
          </span>

          <span>
            Storage files:{" "}
            <strong>
              {stats.files}
            </strong>
          </span>

          {stats.oldestTimestamp ? (
            <span>
              Oldest:{" "}
              <strong>
                {formatDate(
                  stats.oldestTimestamp,
                )}
              </strong>
            </span>
          ) : null}
        </div>
      </section>

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
                {logs.map(
                  (log) => (
                    <tr
                      key={log.id}
                      className={
                        log.level ===
                        "critical"
                          ? styles.criticalRow
                          : undefined
                      }
                    >
                      <td className="sa-table__date">
                        {formatDate(
                          log.at,
                        )}
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
                        <code>
                          {log.area}
                        </code>
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
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">
              {filtered
                ? "No matching events"
                : "No technical events yet"}
            </div>

            <div className="sa-empty__desc">
              {filtered
                ? "Try changing or resetting the current filters."
                : "Runtime, backup, storage and system operations will appear here."}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
