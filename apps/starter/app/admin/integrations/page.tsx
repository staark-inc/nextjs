import Link from "next/link";

import {
  MailConfigurationError,
  summarizeMailConfig,
} from "@staark/platform/server";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  getPrismaClient,
} from "@/lib/db/prisma";

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

export const dynamic =
  "force-dynamic";

type Tone =
  | "success"
  | "warning"
  | "muted";

function Status({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: Tone;
}) {
  return (
    <span
      className={`sa-plan-status sa-plan-status--${tone}`}
    >
      {children}
    </span>
  );
}

export default async function IntegrationsPage() {
  const tenant =
    await requireAdminTenantContext();

  const [
    ga,
    searchConsole,
    subscription,
  ] =
    await Promise.all([
      readGoogleAnalyticsBinding(
        tenant.siteId,
      ),

      readSearchConsoleBinding(
        tenant.siteId,
      ),

      getPrismaClient()
        .subscription
        .findUnique({
          where: {
            siteId:
              tenant.siteId,
          },

          select: {
            provider:
              true,

            providerCustomerId:
              true,

            providerSubscriptionId:
              true,

            status:
              true,
          },
        }),
    ]);

  const gaService =
    googleAnalyticsServiceSummary();

  const searchService =
    searchConsoleServiceSummary();

  let mailConfigured =
    false;

  try {
    mailConfigured =
      summarizeMailConfig()
        .configured;
  } catch (
    error
  ) {
    if (
      !(
        error instanceof
        MailConfigurationError
      )
    ) {
      console.error(
        "[staark] Could not resolve integration mail status:",
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

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

  const googleConnectedCount =
    Number(
      gaConnected,
    ) +
    Number(
      searchConnected,
    );

  const googleRuntimeReady =
    gaService.configured &&
    searchService.configured;

  const stripeConnected =
    Boolean(
      subscription?.provider ===
        "stripe" &&
      subscription
        .providerCustomerId &&
      subscription
        .providerSubscriptionId,
    );

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Growth
          </p>

          <h1 className="sa-h1">
            Integrations
          </h1>

          <p className="sa-subtitle">
            Connect and manage the external
            services used by this website.
          </p>
        </div>
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",

          gap:
            18,
        }}
      >
        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Google
              </p>

              <h2>
                Google services
              </h2>
            </div>

            <Status
              tone={
                googleConnectedCount ===
                  2
                  ? "success"
                  : googleConnectedCount >
                      0
                    ? "warning"
                    : "muted"
              }
            >
              {googleConnectedCount}/2 connected
            </Status>
          </div>

          <p className="sa-note">
            Google Analytics 4 and Search
            Console reporting for this
            website.
          </p>

          <div className="sa-analytics-data-api">
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

            <div>
              <span>
                Runtime credentials
              </span>

              <strong>
                {googleRuntimeReady
                  ? "Configured"
                  : "Needs attention"}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop:
                18,

              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                10,
            }}
          >
            <Link
              href="/admin/analytics/google"
              className="sa-btn"
            >
              Google Analytics
            </Link>

            <Link
              href="/admin/search-console"
              className="sa-btn sa-btn--ghost"
            >
              Search Console
            </Link>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Billing
              </p>

              <h2>
                Stripe
              </h2>
            </div>

            <Status
              tone={
                stripeConnected
                  ? "success"
                  : "muted"
              }
            >
              {stripeConnected
                ? "Connected"
                : "Not connected"}
            </Status>
          </div>

          <p className="sa-note">
            Subscription, invoices and
            payment methods for the current
            Staark package.
          </p>

          <div className="sa-analytics-data-api">
            <div>
              <span>
                Provider
              </span>

              <strong>
                {subscription
                  ?.provider ??
                  "Unavailable"}
              </strong>
            </div>

            <div>
              <span>
                Subscription
              </span>

              <strong>
                {subscription
                  ?.status ??
                  "Unavailable"}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop:
                18,
            }}
          >
            <Link
              href="/admin/plan"
              className="sa-btn"
            >
              Manage billing
            </Link>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Communication
              </p>

              <h2>
                Email / SMTP
              </h2>
            </div>

            <Status
              tone={
                mailConfigured
                  ? "success"
                  : "warning"
              }
            >
              {mailConfigured
                ? "Configured"
                : "Unavailable"}
            </Status>
          </div>

          <p className="sa-note">
            Transactional email transport
            used by website notifications,
            bookings and automations.
          </p>

          <div className="sa-analytics-data-api">
            <div>
              <span>
                Delivery
              </span>

              <strong>
                {mailConfigured
                  ? "Active"
                  : "Not configured"}
              </strong>
            </div>

            <div>
              <span>
                Management
              </span>

              <strong>
                Platform managed
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop:
                18,
            }}
          >
            <Link
              href="/admin/site"
              className="sa-btn"
            >
              Email settings
            </Link>
          </div>
        </section>

        <section className="sa-card">
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Infrastructure
              </p>

              <h2>
                Cloudflare
              </h2>
            </div>

            <Status tone="success">
              Managed by Staark
            </Status>
          </div>

          <p className="sa-note">
            Edge routing, SSL and hostname
            infrastructure are managed by
            the Staark platform.
          </p>

          <div className="sa-analytics-data-api">
            <div>
              <span>
                Configuration
              </span>

              <strong>
                Platform managed
              </strong>
            </div>

            <div>
              <span>
                Domains
              </span>

              <strong>
                Tenant isolated
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop:
                18,
            }}
          >
            <Link
              href="/admin/domains"
              className="sa-btn"
            >
              View domains
            </Link>
          </div>
        </section>
      </div>

      <section
        className="sa-plan-billing-note"
        style={{
          marginTop:
            20,
        }}
      >
        <div>
          <p className="sa-card__eyebrow">
            Integration model
          </p>

          <strong>
            One place for connected services
          </strong>

          <span>
            Integrations contains connection
            and service status. Reporting data
            remains in Analytics, while
            service-specific setup will move
            here progressively.
          </span>
        </div>
      </section>
    </>
  );
}
