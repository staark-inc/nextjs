import Link from "next/link";
import { redirect } from "next/navigation";

import { readAdminAnalytics } from "@/lib/admin-analytics";
import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import { readGoogleAnalyticsBinding } from "@/lib/google-analytics-binding";
import { requireAdminTenantContext } from "@/lib/admin-tenant";
import { readAdminGoogleAnalytics } from "@/lib/admin-google-analytics";

export const dynamic = "force-dynamic";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function AnalyticsPage() {
  let analytics: Awaited<
    ReturnType<typeof readAdminAnalytics>
  >;

  const site =
    await readAdminSiteSettings();

  const tenant =
    await requireAdminTenantContext();

  const googleAnalytics =
    await readGoogleAnalyticsBinding(
      tenant.siteId,
    );

  try {
    analytics =
      await readAdminAnalytics();
  } catch {
    redirect("/admin/plan");
  }

  const maxViews = Math.max(
    1,
    ...analytics.daily.map(
      (item) => item.pageViews,
    ),
  );

  const chart =
    analytics.daily.length > 60
      ? analytics.daily.slice(-60)
      : analytics.daily;

  const ga4 =
    await readAdminGoogleAnalytics(
      tenant.siteId,
      analytics.access.level,
    );

  return (
    <div className="sa-analytics-page">
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Growth
          </p>

          <h1 className="sa-h1">
            Analytics
          </h1>

          <p className="sa-subtitle">
            Privacy-friendly traffic analytics
            collected directly by your website.
          </p>
        </div>

        <div className="sa-analytics-header-actions">
          <Link
            href="/admin/analytics/google"
            className="sa-btn"
          >
            Google Analytics
            {googleAnalytics.enabled &&
            googleAnalytics.measurementId
              ? " · Connected"
              : ""}
          </Link>

          <span className="sa-plan-status sa-plan-status--success">
            {analytics.access.level}
          </span>
        </div>
      </div>

      <div className="sa-plan-usage-grid">
        <article className="sa-plan-usage-card">
          <span>Page views</span>
          <strong>
            {formatNumber(
              analytics.totalPageViews,
            )}
          </strong>
          <p>
            Last {analytics.days} days
          </p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Average</span>
          <strong>
            {formatNumber(
              analytics.averagePerDay,
            )}
          </strong>
          <p>Page views per day</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Active days</span>
          <strong>
            {analytics.activeDays}
          </strong>
          <p>
            Days with recorded traffic
          </p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Tracked pages</span>
          <strong>
            {analytics.trackedPages}
          </strong>
          <p>
            Public paths with traffic
          </p>
        </article>
      </div>

      <section className="sa-card sa-analytics-card">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">
              Traffic
            </p>
            <h2>Recent page views</h2>
          </div>

          <span className="sa-note">
            Showing the latest{" "}
            {chart.length} days
          </span>
        </div>

        {analytics.totalPageViews === 0 ? (
          <div className="sa-analytics-empty-chart">
            <div className="sa-analytics-empty-chart__icon">
              ↗
            </div>

            <strong>
              No traffic recorded yet
            </strong>

            <span>
              Page views will appear here as
              visitors browse the public website.
            </span>
          </div>
        ) : (
          <div className="sa-analytics-chart">
            {chart.map((item) => {
              const height = Math.max(
                8,
                Math.round(
                  (item.pageViews /
                    maxViews) *
                    100,
                ),
              );

              return (
                <div
                  className="sa-analytics-bar-column"
                  key={item.date}
                  title={`${formatDate(
                    item.date,
                  )}: ${
                    item.pageViews
                  } page views`}
                >
                  <div className="sa-analytics-bar-space">
                    <span
                      className="sa-analytics-bar"
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <small>
                    {chart.length <= 31
                      ? formatDate(item.date)
                      : ""}
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="sa-card sa-analytics-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Content
          </p>
          <h2>Top pages</h2>
        </div>

        {analytics.topPages.length ? (
          <div className="sa-analytics-pages">
            {analytics.topPages.map(
              (page, index) => (
                <div
                  className="sa-analytics-page-row"
                  key={page.path}
                >
                  <span>
                    {index + 1}
                  </span>

                  <strong>
                    {page.path}
                  </strong>

                  <small>
                    {formatNumber(
                      page.pageViews,
                    )}{" "}
                    views
                  </small>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="sa-note">
            No traffic has been recorded yet.
          </p>
        )}
      </section>

      <div className="sa-plan-section-heading sa-ga4-section-heading">
        <div>
          <p className="sa-card__eyebrow">
            Google Analytics 4
          </p>

          <h2>Audience & acquisition</h2>
        </div>

        <Link
          href="/admin/analytics/google"
          className="sa-btn"
        >
          Configure GA4
        </Link>
      </div>

      {!ga4.configured ? (
        <section className="sa-card sa-ga4-empty">
          <strong>
            Connect a GA4 Property
          </strong>

          <span>
            Add the numeric Property ID to
            load users, sessions, traffic
            sources, devices and landing
            pages.
          </span>

          <Link href="/admin/analytics/google">
            Open Google Analytics settings →
          </Link>
        </section>
      ) : ga4.error ? (
        <section className="sa-analytics-google-warning">
          <strong>
            Google Analytics data unavailable
          </strong>

          <span>
            {ga4.error}
          </span>

          <Link href="/admin/analytics/google">
            Check connection →
          </Link>
        </section>
      ) : (
        <>
          <div className="sa-ga4-stat-grid">
            <article className="sa-plan-usage-card">
              <span>Active users</span>

              <strong>
                {formatNumber(
                  ga4.metrics
                    .activeUsers,
                )}
              </strong>

              <p>
                Last {ga4.days} days
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>Sessions</span>

              <strong>
                {formatNumber(
                  ga4.metrics.sessions,
                )}
              </strong>

              <p>
                Google Analytics sessions
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>Views</span>

              <strong>
                {formatNumber(
                  ga4.metrics.pageViews,
                )}
              </strong>

              <p>
                Pages and screen views
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>Engagement rate</span>

              <strong>
                {formatNumber(
                  ga4.metrics
                    .engagementRate *
                    100,
                )}%
              </strong>

              <p>
                Engaged sessions
              </p>
            </article>
          </div>

          {analytics.access.level !==
          "overview" ? (
            <div className="sa-ga4-grid">
              <section className="sa-card">
                <div className="sa-card__header">
                  <p className="sa-card__eyebrow">
                    Acquisition
                  </p>

                  <h2>
                    Traffic sources
                  </h2>
                </div>

                <div className="sa-ga4-list">
                  {ga4.sources.length ? (
                    ga4.sources.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="sa-ga4-list-row"
                        >
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {item.label}
                          </strong>

                          <small>
                            {formatNumber(
                              item.value,
                            )}{" "}
                            sessions
                          </small>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="sa-note">
                      No acquisition data yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="sa-card">
                <div className="sa-card__header">
                  <p className="sa-card__eyebrow">
                    Audience
                  </p>

                  <h2>Devices</h2>
                </div>

                <div className="sa-ga4-list">
                  {ga4.devices.length ? (
                    ga4.devices.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="sa-ga4-list-row"
                        >
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {item.label}
                          </strong>

                          <small>
                            {formatNumber(
                              item.value,
                            )}{" "}
                            sessions
                          </small>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="sa-note">
                      No device data yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {analytics.access.level !==
          "overview" ? (
            <section className="sa-card sa-analytics-card">
              <div className="sa-card__header">
                <p className="sa-card__eyebrow">
                  Acquisition
                </p>

                <h2>
                  Top landing pages
                </h2>
              </div>

              <div className="sa-analytics-pages">
                {ga4.landingPages.length ? (
                  ga4.landingPages.map(
                    (
                      page,
                      index,
                    ) => (
                      <div
                        className="sa-analytics-page-row"
                        key={
                          page.path
                        }
                      >
                        <span>
                          {index + 1}
                        </span>

                        <strong>
                          {page.path}
                        </strong>

                        <small>
                          {formatNumber(
                            page.sessions,
                          )}{" "}
                          sessions ·{" "}
                          {formatNumber(
                            page.activeUsers,
                          )}{" "}
                          users
                        </small>
                      </div>
                    ),
                  )
                ) : (
                  <p className="sa-note">
                    No landing page data yet.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="sa-plan-billing-note">
        <div>
          <p className="sa-card__eyebrow">
            Privacy
          </p>

          <strong>
            No visitor profiles
          </strong>

          <span>
            Staark Analytics stores daily
            aggregate page-view counts. This
            version does not store IP addresses,
            cookies or raw visitor identifiers.
          </span>
        </div>
      </section>
    </div>
  );
}
