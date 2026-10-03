import { redirect } from "next/navigation";

import { readAdminAnalytics } from "@/lib/admin-analytics";

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

  return (
    <>
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

        <span className="sa-plan-status sa-plan-status--success">
          {analytics.access.level}
        </span>
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

        <div className="sa-analytics-chart">
          {chart.map((item) => {
            const height =
              item.pageViews === 0
                ? 2
                : Math.max(
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
    </>
  );
}
