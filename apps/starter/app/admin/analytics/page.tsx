import Link from "next/link";
import { redirect } from "next/navigation";

import {
  readAdminAnalytics,
} from "@/lib/admin-analytics";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  readAdminGoogleAnalytics,
} from "@/lib/admin-google-analytics";

import {
  readAdminSearchConsole,
} from "@/lib/admin-search-console";

import {
  getPlanFeatureAccess,
} from "@/lib/feature-access";

import {
  readGoogleAnalyticsBinding,
} from "@/lib/google-analytics-binding";

import {
  readSearchConsoleBinding,
} from "@/lib/search-console-binding";

export const dynamic =
  "force-dynamic";

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "sv-SE",
    {
      maximumFractionDigits:
        1,
    },
  ).format(value);
}

function formatTrend(
  value: number | null,
): string {
  if (
    value === null
  ) {
    return "New traffic";
  }

  const formatted =
    new Intl.NumberFormat(
      "sv-SE",
      {
        maximumFractionDigits:
          1,

        signDisplay:
          "always",
      },
    ).format(value);

  return `${formatted}%`;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      month:
        "short",

      day:
        "numeric",
    },
  ).format(
    new Date(
      `${value}T00:00:00Z`,
    ),
  );
}

export default async function AnalyticsPage() {
  let analytics: Awaited<
    ReturnType<
      typeof readAdminAnalytics
    >
  >;

  const tenant =
    await requireAdminTenantContext();

  const [
    googleAnalytics,
    searchBinding,
  ] =
    await Promise.all([
      readGoogleAnalyticsBinding(
        tenant.siteId,
      ),

      readSearchConsoleBinding(
        tenant.siteId,
      ),
    ]);

  try {
    analytics =
      await readAdminAnalytics();
  } catch {
    redirect(
      "/admin/plan",
    );
  }

  const searchAccess =
    getPlanFeatureAccess(
      tenant.entitlements,
      "searchConsole",
    );

  const maxViews =
    Math.max(
      1,
      ...analytics.daily.map(
        (item) =>
          item.pageViews,
      ),
    );

  const chart =
    analytics.daily.length >
      60
      ? analytics.daily.slice(
          -60,
        )
      : analytics.daily;

  const [
    ga4,
    searchConsole,
  ] =
    await Promise.all([
      readAdminGoogleAnalytics(
        tenant.siteId,
        analytics.access.level,
      ),

      searchAccess.enabled
        ? readAdminSearchConsole(
            tenant.siteId,
            searchAccess.level,
          )
        : Promise.resolve(
            null,
          ),
    ]);

  const gaConnected =
    Boolean(
      googleAnalytics.enabled &&
      googleAnalytics.measurementId &&
      googleAnalytics.propertyId &&
      googleAnalytics.verifiedAt,
    );

  const searchConnected =
    Boolean(
      searchBinding.enabled &&
      searchBinding.siteUrl &&
      searchBinding.verifiedAt,
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
            Website traffic, audience and
            Google Search performance in
            one place.
          </p>
        </div>

        <div className="sa-analytics-header-actions">
          <Link
            href="/admin/integrations/google"
            className="sa-btn"
          >
            Google services
          </Link>

          <span className="sa-plan-status sa-plan-status--success">
            {analytics.access.level}
          </span>
        </div>
      </div>

      <section
        className="sa-card"
        style={{
          marginBottom:
            20,
        }}
      >
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Data sources
          </p>

          <h2>
            Connected analytics
          </h2>
        </div>

        <div className="sa-analytics-data-api">
          <div>
            <span>
              Staark Analytics
            </span>

            <strong>
              Active
            </strong>
          </div>

          <div>
            <span>
              Google Analytics 4
            </span>

            <strong>
              {gaConnected
                ? "Connected"
                : "Not connected"}
            </strong>
          </div>

          <div>
            <span>
              Search Console
            </span>

            <strong>
              {searchConnected
                ? "Connected"
                : "Not connected"}
            </strong>
          </div>
        </div>
      </section>

      <div className="sa-plan-section-heading">
        <div>
          <p className="sa-card__eyebrow">
            Staark Analytics
          </p>

          <h2>
            Website traffic
          </h2>
        </div>

        <span className="sa-note">
          Privacy-friendly first-party
          traffic analytics
        </span>
      </div>

      <div className="sa-plan-usage-grid">
        <article className="sa-plan-usage-card">
          <span>
            Page views
          </span>

          <strong>
            {formatNumber(
              analytics.totalPageViews,
            )}
          </strong>

          <p>
            Last {analytics.days} days ·{" "}
            {formatTrend(
              analytics
                .pageViewsChangePercent,
            )}{" "}
            vs previous period
          </p>
        </article>

        <article className="sa-plan-usage-card">
          <span>
            Previous period
          </span>

          <strong>
            {formatNumber(
              analytics.previousPageViews,
            )}
          </strong>

          <p>
            Previous {analytics.days} days
          </p>
        </article>

        <article className="sa-plan-usage-card">
          <span>
            Average / day
          </span>

          <strong>
            {formatNumber(
              analytics.averagePerDay,
            )}
          </strong>

          <p>
            Across the current period
          </p>
        </article>

        <article className="sa-plan-usage-card">
          <span>
            Public pages tracked
          </span>

          <strong>
            {analytics.trackedPages}
          </strong>

          <p>
            {analytics.activeDays} active day{
              analytics.activeDays ===
                1
                ? ""
                : "s"
            }
          </p>
        </article>
      </div>

      <section className="sa-card sa-analytics-card">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">
              Traffic
            </p>

            <h2>
              Recent page views
            </h2>
          </div>

          <span className="sa-note">
            Showing the latest{" "}
            {chart.length} days
          </span>
        </div>

        {analytics.totalPageViews ===
        0 ? (
          <div className="sa-analytics-empty-chart">
            <div className="sa-analytics-empty-chart__icon">
              ↗
            </div>

            <strong>
              No traffic recorded yet
            </strong>

            <span>
              Page views will appear here
              as visitors browse the public
              website.
            </span>
          </div>
        ) : (
          <div className="sa-analytics-chart">
            {chart.map(
              (item) => {
                const height =
                  Math.max(
                    8,
                    Math.round(
                      (
                        item.pageViews /
                        maxViews
                      ) *
                        100,
                    ),
                  );

                return (
                  <div
                    className="sa-analytics-bar-column"
                    key={
                      item.date
                    }
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
                          height:
                            `${height}%`,
                        }}
                      />
                    </div>

                    <small>
                      {chart.length <=
                      31
                        ? formatDate(
                            item.date,
                          )
                        : ""}
                    </small>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="sa-card sa-analytics-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Content
          </p>

          <h2>
            Top pages
          </h2>
        </div>

        {analytics.topPages.length ? (
          <div className="sa-analytics-pages">
            {analytics.topPages.map(
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

      <section
        id="google-analytics"
        style={{
          scrollMarginTop:
            110,
        }}
      >
        <div className="sa-plan-section-heading sa-ga4-section-heading">
          <div>
            <p className="sa-card__eyebrow">
              Google Analytics 4
            </p>

            <h2>
              Audience & acquisition
            </h2>
          </div>

          <Link
            href="/admin/integrations/google#analytics"
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
              Configure Google Analytics
              under Integrations to load
              users, sessions, traffic
              sources, devices and landing
              pages.
            </span>

            <Link href="/admin/integrations/google#analytics">
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

            <Link href="/admin/integrations/google#analytics">
              Check connection →
            </Link>
          </section>
        ) : (
          <>
            <div className="sa-ga4-stat-grid">
              <article className="sa-plan-usage-card">
                <span>
                  Active users
                </span>

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
                <span>
                  Sessions
                </span>

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
                <span>
                  Views
                </span>

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
                <span>
                  Engagement rate
                </span>

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

                    <h2>
                      Devices
                    </h2>
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
      </section>

      <section
        id="search-console"
        style={{
          scrollMarginTop:
            110,

          marginTop:
            30,
        }}
      >
        <div className="sa-plan-section-heading">
          <div>
            <p className="sa-card__eyebrow">
              Google Search Console
            </p>

            <h2>
              Search performance
            </h2>
          </div>

          <Link
            href="/admin/integrations/google#search-console"
            className="sa-btn"
          >
            Configure Search Console
          </Link>
        </div>

        {!searchAccess.enabled ? (
          <section className="sa-card sa-ga4-empty">
            <strong>
              Search Console is not included
              in this package.
            </strong>

            <span>
              Upgrade the current package to
              access Google Search
              performance reporting.
            </span>

            <Link href="/admin/plan">
              View plan →
            </Link>
          </section>
        ) : !searchConsole?.configured ? (
          <section className="sa-card sa-ga4-empty">
            <strong>
              Connect Search Console
            </strong>

            <span>
              Configure and verify this
              website&apos;s Search Console
              property under Integrations.
            </span>

            <Link href="/admin/integrations/google#search-console">
              Open Search Console settings →
            </Link>
          </section>
        ) : searchConsole.error ? (
          <section className="sa-analytics-google-warning">
            <strong>
              Search Console data unavailable
            </strong>

            <span>
              {searchConsole.error}
            </span>

            <Link href="/admin/integrations/google#search-console">
              Check connection →
            </Link>
          </section>
        ) : searchConsole.connected ? (
          <>
            <div className="sa-plan-usage-grid">
              <article className="sa-plan-usage-card">
                <span>
                  Clicks
                </span>

                <strong>
                  {formatNumber(
                    searchConsole
                      .metrics.clicks,
                  )}
                </strong>

                <p>
                  Last {searchConsole.days} days
                </p>
              </article>

              <article className="sa-plan-usage-card">
                <span>
                  Impressions
                </span>

                <strong>
                  {formatNumber(
                    searchConsole
                      .metrics.impressions,
                  )}
                </strong>

                <p>
                  Google result views
                </p>
              </article>

              <article className="sa-plan-usage-card">
                <span>
                  CTR
                </span>

                <strong>
                  {formatNumber(
                    searchConsole
                      .metrics.ctr *
                      100,
                  )}%
                </strong>

                <p>
                  Click-through rate
                </p>
              </article>

              <article className="sa-plan-usage-card">
                <span>
                  Average position
                </span>

                <strong>
                  {formatNumber(
                    searchConsole
                      .metrics.position,
                  )}
                </strong>

                <p>
                  Search ranking
                </p>
              </article>
            </div>

            <div className="sa-ga4-grid">
              <section className="sa-card">
                <div className="sa-card__header">
                  <p className="sa-card__eyebrow">
                    Search queries
                  </p>

                  <h2>
                    Top Google searches
                  </h2>
                </div>

                <div className="sa-ga4-list">
                  {searchConsole.queries.length ? (
                    searchConsole.queries.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          className="sa-ga4-list-row"
                          key={
                            item.label
                          }
                        >
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {item.label}
                          </strong>

                          <small>
                            {formatNumber(
                              item.clicks,
                            )}{" "}
                            clicks
                            {" · "}
                            {formatNumber(
                              item.impressions,
                            )}{" "}
                            impressions
                            {" · "}#
                            {formatNumber(
                              item.position,
                            )}
                          </small>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="sa-note">
                      No search query data yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="sa-card">
                <div className="sa-card__header">
                  <p className="sa-card__eyebrow">
                    Search content
                  </p>

                  <h2>
                    Top search pages
                  </h2>
                </div>

                <div className="sa-ga4-list">
                  {searchConsole.pages.length ? (
                    searchConsole.pages.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          className="sa-ga4-list-row"
                          key={
                            item.label
                          }
                        >
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {item.label}
                          </strong>

                          <small>
                            {formatNumber(
                              item.clicks,
                            )}{" "}
                            clicks
                            {" · "}
                            {formatNumber(
                              item.ctr *
                                100,
                            )}% CTR
                          </small>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="sa-note">
                      No search page data yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </section>

      <section className="sa-plan-billing-note">
        <div>
          <p className="sa-card__eyebrow">
            Privacy
          </p>

          <strong>
            Three sources, one dashboard
          </strong>

          <span>
            Staark Analytics provides
            privacy-friendly first-party
            traffic counts. Google Analytics
            adds audience and acquisition
            reporting, while Search Console
            adds organic search performance.
          </span>
        </div>
      </section>
    </div>
  );
}
