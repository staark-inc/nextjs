"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./health.module.css";

type HealthSeverity = "error" | "warning";
type HealthCategory =
  | "content"
  | "links"
  | "navigation"
  | "media"
  | "seo"
  | "redirects";

type HealthIssue = {
  id: string;
  category: HealthCategory;
  severity: HealthSeverity;
  title: string;
  detail: string;
  source?: string;
  href?: string;
};

type HealthCheck = {
  id: HealthCategory;
  label: string;
  status: "ok" | "warning" | "error";
  issues: number;
};

type SiteHealthReport = {
  checkedAt: string;
  counts: {
    errors: number;
    warnings: number;
    passed: number;
    checks: number;
  };
  checks: HealthCheck[];
  issues: HealthIssue[];
};

type Filter = "all" | "error" | "warning";

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function SiteHealthPage() {
  const [report, setReport] = useState<SiteHealthReport | null>(null);
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  async function runChecks() {
    setRunning(true);
    setError("");

    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Site health scan failed.");
      setReport(data as SiteHealthReport);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Site health scan failed.");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    void runChecks();
  }, []);

  const visibleIssues = useMemo(() => {
    if (!report) return [];
    if (filter === "all") return report.issues;
    return report.issues.filter((issue) => issue.severity === filter);
  }, [filter, report]);

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Diagnostics</span>
          <h1 className="sa-h1">Site Health</h1>
          <p className="sa-subtitle">
            Check content integrity, links, navigation, media, SEO and redirects before problems reach visitors.
          </p>
        </div>
        <div className="sa-page-header__actions">
          <button
            className="sa-btn sa-btn--primary"
            type="button"
            onClick={() => void runChecks()}
            disabled={running}
          >
            {running ? "Running checks…" : "Run checks"}
          </button>
        </div>
      </section>

      {error ? (
        <div className={styles.scanError}>
          <strong>Health scan failed</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {report ? (
        <>
          <section className="sa-stats sa-stats--dashboard" aria-label="Site health overview">
            <article className="sa-stat sa-stat--v2">
              <div className="sa-stat__label">Errors</div>
              <div className="sa-stat__value">{report.counts.errors}</div>
              <div className="sa-stat__desc">Problems that can break visitor flows</div>
            </article>
            <article className="sa-stat sa-stat--v2">
              <div className="sa-stat__label">Warnings</div>
              <div className="sa-stat__value">{report.counts.warnings}</div>
              <div className="sa-stat__desc">Items worth reviewing</div>
            </article>
            <article className="sa-stat sa-stat--v2">
              <div className="sa-stat__label">Passed</div>
              <div className="sa-stat__value">{report.counts.passed}/{report.counts.checks}</div>
              <div className="sa-stat__desc">Checks with no findings</div>
            </article>
            <article className="sa-stat sa-stat--v2">
              <div className="sa-stat__label">Last checked</div>
              <div className={`sa-stat__value ${styles.checkedAt}`}>{formatCheckedAt(report.checkedAt)}</div>
              <div className="sa-stat__desc">Live deployment filesystem</div>
            </article>
          </section>

          <section className={styles.checkGrid} aria-label="Health checks">
            {report.checks.map((check) => (
              <article className={styles.checkCard} key={check.id}>
                <span
                  className={`${styles.checkState} ${
                    check.status === "ok"
                      ? styles.checkOk
                      : check.status === "error"
                        ? styles.checkError
                        : styles.checkWarning
                  }`}
                  aria-hidden="true"
                >
                  {check.status === "ok" ? "✓" : check.status === "error" ? "!" : "•"}
                </span>
                <div>
                  <strong>{check.label}</strong>
                  <span>
                    {check.status === "ok"
                      ? "No issues found"
                      : `${check.issues} finding${check.issues === 1 ? "" : "s"}`}
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className={`sa-card ${styles.findingsCard}`}>
            <div className={styles.findingsHeader}>
              <div>
                <span className="sa-card__eyebrow">Findings</span>
                <h2>
                  {report.issues.length
                    ? `${report.issues.length} item${report.issues.length === 1 ? "" : "s"} need attention`
                    : "No problems found"}
                </h2>
              </div>

              {report.issues.length ? (
                <div className={styles.filters} aria-label="Filter findings">
                  <button
                    className={filter === "all" ? styles.filterActive : ""}
                    type="button"
                    onClick={() => setFilter("all")}
                  >
                    All {report.issues.length}
                  </button>
                  <button
                    className={filter === "error" ? styles.filterActive : ""}
                    type="button"
                    onClick={() => setFilter("error")}
                  >
                    Errors {report.counts.errors}
                  </button>
                  <button
                    className={filter === "warning" ? styles.filterActive : ""}
                    type="button"
                    onClick={() => setFilter("warning")}
                  >
                    Warnings {report.counts.warnings}
                  </button>
                </div>
              ) : null}
            </div>

            {report.issues.length === 0 ? (
              <div className={styles.allClear}>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Everything checked out</strong>
                  <p>No broken links, missing assets or configuration conflicts were found.</p>
                </div>
              </div>
            ) : (
              <div className={styles.findings}>
                {visibleIssues.map((issue) => (
                  <article className={styles.finding} key={issue.id}>
                    <div
                      className={`${styles.severity} ${
                        issue.severity === "error" ? styles.severityError : styles.severityWarning
                      }`}
                    >
                      {issue.severity === "error" ? "Error" : "Warning"}
                    </div>

                    <div className={styles.findingBody}>
                      <div className={styles.findingMeta}>
                        <span>{issue.category}</span>
                        {issue.source ? <code>{issue.source}</code> : null}
                      </div>
                      <strong>{issue.title}</strong>
                      <p>{issue.detail}</p>
                    </div>

                    {issue.href ? (
                      <a className="sa-btn sa-btn--ghost sa-btn--sm" href={issue.href}>
                        Fix →
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : running ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty__title">Running site health checks…</div>
            <div className="sa-empty__desc">Reading the active content, media and redirect configuration.</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
