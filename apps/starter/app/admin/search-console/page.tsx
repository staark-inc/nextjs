import {
  getPlanFeatureAccess,
} from "@/lib/feature-access";
import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";
import {
  readAdminSearchConsole,
} from "@/lib/admin-search-console";
import {
  readSearchConsoleBinding,
} from "@/lib/search-console-binding";
import {
  searchConsoleServiceSummary,
} from "@/lib/google-search-console-data";

import SearchConsoleForm from "./SearchConsoleForm";

export const dynamic = "force-dynamic";

function n(value: number) {
  return new Intl.NumberFormat(
    "sv-SE",
    {
      maximumFractionDigits: 1,
    },
  ).format(value);
}

export default async function SearchConsolePage() {
  const tenant =
    await requireAdminTenantContext();

  const access =
    getPlanFeatureAccess(
      tenant.entitlements,
      "searchConsole",
    );

  const binding =
    await readSearchConsoleBinding(
      tenant.siteId,
    );

  const service =
    searchConsoleServiceSummary();

  const data =
    access.enabled
      ? await readAdminSearchConsole(
          tenant.siteId,
          access.level,
        )
      : null;

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">
            Growth
          </span>

          <h1 className="sa-h1">
            Search Console
          </h1>

          <p className="sa-subtitle">
            See how customers find your
            website in Google Search.
          </p>
        </div>
      </section>

      {!service.configured ? (
        <div className="sa-analytics-google-warning">
          Google Search Console service
          credentials are not configured on
          this runtime.
        </div>
      ) : null}

      {!binding.enabled ||
      !binding.siteUrl ? (
        <SearchConsoleForm
          initialSiteUrl={
            binding.siteUrl ?? ""
          }
          initialEnabled={
            binding.enabled
          }
          clientEmail={
            service.clientEmail
          }
          initialVerification={
            binding.verification
          }
/>
      ) : null}

      {data?.error ? (
        <div className="sa-analytics-google-warning">
          <strong>
            Search Console data unavailable
          </strong>

          <span>
            {data.error}
          </span>
        </div>
      ) : null}

      {data?.connected ? (
        <>
          <div className="sa-plan-usage-grid">
            <article className="sa-plan-usage-card">
              <span>Clicks</span>
              <strong>
                {n(data.metrics.clicks)}
              </strong>
              <p>
                Last {data.days} days
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>Impressions</span>
              <strong>
                {n(
                  data.metrics.impressions,
                )}
              </strong>
              <p>
                Google result views
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>CTR</span>
              <strong>
                {n(
                  data.metrics.ctr *
                    100,
                )}%
              </strong>
              <p>
                Click-through rate
              </p>
            </article>

            <article className="sa-plan-usage-card">
              <span>Average position</span>
              <strong>
                {n(
                  data.metrics.position,
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
                {data.queries.map(
                  (item, index) => (
                    <div
                      className="sa-ga4-list-row"
                      key={item.label}
                    >
                      <span>
                        {index + 1}
                      </span>

                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {n(item.clicks)} clicks
                        {" · "}
                        {n(
                          item.impressions,
                        )} impressions
                        {" · "}
                        #{n(item.position)}
                      </small>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="sa-card">
              <div className="sa-card__header">
                <p className="sa-card__eyebrow">
                  Content
                </p>

                <h2>
                  Top search pages
                </h2>
              </div>

              <div className="sa-ga4-list">
                {data.pages.map(
                  (item, index) => (
                    <div
                      className="sa-ga4-list-row"
                      key={item.label}
                    >
                      <span>
                        {index + 1}
                      </span>

                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {n(item.clicks)} clicks
                        {" · "}
                        {n(
                          item.ctr *
                            100,
                        )}% CTR
                      </small>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>

          <SearchConsoleForm
            initialSiteUrl={
              binding.siteUrl ?? ""
            }
            initialEnabled={
              binding.enabled
            }
            clientEmail={
              service.clientEmail
            }
            initialVerification={
              binding.verification
            }
/>
        </>
      ) : null}
    </>
  );
}
