import Link from "next/link";

import {
  getPlanFeatureAccess,
} from "@/lib/feature-access";

import {
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  readGoogleAnalyticsBinding,
} from "@/lib/google-analytics-binding";

import {
  googleAnalyticsServiceSummary,
} from "@/lib/google-analytics-data";

import {
  readSearchConsoleBinding,
} from "@/lib/search-console-binding";

import {
  searchConsoleServiceSummary,
} from "@/lib/google-search-console-data";

import GoogleAnalyticsForm from "../../analytics/google/GoogleAnalyticsForm";
import SearchConsoleForm from "../../search-console/SearchConsoleForm";

export const dynamic =
  "force-dynamic";

type StatusTone =
  | "success"
  | "warning"
  | "muted";

function Status({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`sa-plan-status sa-plan-status--${tone}`}
    >
      {children}
    </span>
  );
}

export default async function GoogleIntegrationsPage() {
  const site =
    await readAdminSiteSettings();

  const tenant =
    await requireAdminTenantContext();

  const [
    ga,
    searchConsole,
  ] =
    await Promise.all([
      readGoogleAnalyticsBinding(
        tenant.siteId,
      ),

      readSearchConsoleBinding(
        tenant.siteId,
      ),
    ]);

  const gaService =
    googleAnalyticsServiceSummary();

  const searchService =
    searchConsoleServiceSummary();

  const analyticsAccess =
    getPlanFeatureAccess(
      tenant.entitlements,
      "analytics",
    );

  const searchAccess =
    getPlanFeatureAccess(
      tenant.entitlements,
      "searchConsole",
    );

  const gaConnected =
    Boolean(
      ga.enabled &&
      ga.measurementId &&
      ga.propertyId &&
      ga.verifiedAt,
    );

  const searchConnected =
    Boolean(
      searchConsole.enabled &&
      searchConsole.siteUrl &&
      searchConsole.verifiedAt,
    );

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Integrations / Google
          </p>

          <h1 className="sa-h1">
            Google services
          </h1>

          <p className="sa-subtitle">
            Configure Google Analytics 4
            and Search Console for this
            website.
          </p>
        </div>

        <Link
          href="/admin/integrations"
          className="sa-btn"
        >
          ← Integrations
        </Link>
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",

          gap:
            18,

          marginBottom:
            20,
        }}
      >
        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Analytics
              </p>

              <h2>
                Google Analytics 4
              </h2>
            </div>

            <Status
              tone={
                gaConnected
                  ? "success"
                  : gaService.configured
                    ? "warning"
                    : "muted"
              }
            >
              {gaConnected
                ? "Connected"
                : gaService.configured
                  ? "Ready to configure"
                  : "Runtime unavailable"}
            </Status>
          </div>

          <p className="sa-note">
            Audience, acquisition,
            sessions and landing page
            reporting.
          </p>

          <div className="sa-analytics-data-api">
            <div>
              <span>
                Measurement ID
              </span>

              <strong>
                {ga.measurementId ??
                  "Not configured"}
              </strong>
            </div>

            <div>
              <span>
                Property ID
              </span>

              <strong>
                {ga.propertyId ??
                  "Not configured"}
              </strong>
            </div>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Search
              </p>

              <h2>
                Search Console
              </h2>
            </div>

            <Status
              tone={
                searchConnected
                  ? "success"
                  : searchService.configured
                    ? "warning"
                    : "muted"
              }
            >
              {searchConnected
                ? "Connected"
                : searchService.configured
                  ? "Ready to configure"
                  : "Runtime unavailable"}
            </Status>
          </div>

          <p className="sa-note">
            Google search clicks,
            impressions, CTR, queries and
            ranking position.
          </p>

          <div className="sa-analytics-data-api">
            <div>
              <span>
                Property
              </span>

              <strong>
                {searchConsole.siteUrl ??
                  "Not configured"}
              </strong>
            </div>

            <div>
              <span>
                Verification
              </span>

              <strong>
                {searchConsole.verification
                  .fileName
                  ? "HTML file uploaded"
                  : searchConsole.siteUrl
                      ?.startsWith(
                        "sc-domain:",
                      )
                    ? "DNS"
                    : "Not configured"}
              </strong>
            </div>
          </div>

          {searchConnected ? (
            <div
              style={{
                marginTop:
                  18,
              }}
            >
              <Link
                href="/admin/search-console"
                className="sa-btn sa-btn--ghost"
              >
                View Search Console data
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <section
        id="analytics"
        style={{
          scrollMarginTop:
            110,
        }}
      >
        <div className="sa-plan-section-heading">
          <div>
            <p className="sa-card__eyebrow">
              Google Analytics 4
            </p>

            <h2>
              Analytics connection
            </h2>
          </div>

          <Status
            tone={
              analyticsAccess.enabled
                ? "success"
                : "muted"
            }
          >
            {analyticsAccess.enabled
              ? analyticsAccess.level
              : "Not included"}
          </Status>
        </div>

        {analyticsAccess.enabled ? (
          <GoogleAnalyticsForm
            initial={
              ga
            }
            analyticsConsentEnabled={
              site.privacy
                .analyticsConsentEnabled
            }
            dataApiConfigured={
              gaService.configured
            }
            serviceAccountEmail={
              gaService.clientEmail
            }
          />
        ) : (
          <section className="sa-card">
            <strong>
              Google Analytics is not
              included in this package.
            </strong>

            <p className="sa-note">
              Upgrade the current package
              to enable GA4 reporting.
            </p>

            <Link
              href="/admin/plan"
              className="sa-btn"
            >
              View plan
            </Link>
          </section>
        )}
      </section>

      <section
        id="search-console"
        style={{
          scrollMarginTop:
            110,

          marginTop:
            28,
        }}
      >
        <div className="sa-plan-section-heading">
          <div>
            <p className="sa-card__eyebrow">
              Google Search Console
            </p>

            <h2>
              Search connection
            </h2>
          </div>

          <Status
            tone={
              searchAccess.enabled
                ? "success"
                : "muted"
            }
          >
            {searchAccess.enabled
              ? searchAccess.level
              : "Not included"}
          </Status>
        </div>

        {searchAccess.enabled ? (
          <SearchConsoleForm
            initialSiteUrl={
              searchConsole.siteUrl ??
              ""
            }
            initialEnabled={
              searchConsole.enabled
            }
            clientEmail={
              searchService.clientEmail
            }
            initialVerification={
              searchConsole.verification
            }
          />
        ) : (
          <section className="sa-card">
            <strong>
              Search Console is not
              included in this package.
            </strong>

            <p className="sa-note">
              Upgrade the current package
              to enable Google Search
              performance reporting.
            </p>

            <Link
              href="/admin/plan"
              className="sa-btn"
            >
              View plan
            </Link>
          </section>
        )}
      </section>
    </>
  );
}
