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

import styles from "./integrations.module.css";

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

  const prisma =
    getPrismaClient();

  const [
    ga,
    searchConsole,
    subscription,
    domains,
  ] =
    await Promise.all([
      readGoogleAnalyticsBinding(
        tenant.siteId,
      ),

      readSearchConsoleBinding(
        tenant.siteId,
      ),

      prisma.subscription.findUnique({
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

      prisma.domain.findMany({
        where: {
          siteId:
            tenant.siteId,

          releasedAt:
            null,
        },

        select: {
          type:
            true,

          provider:
            true,

          providerStatus:
            true,

          sslStatus:
            true,

          verified:
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

  const customDomains =
    domains.filter(
      (domain) =>
        domain.type ===
        "custom",
    );

  const cloudflareActive =
    customDomains.filter(
      (domain) =>
        domain.verified &&
        domain.providerStatus ===
          "active" &&
        domain.sslStatus ===
          "active",
    ).length;

  const googleHealthy =
    googleConnectedCount ===
      2 &&
    googleRuntimeReady;

  const needsAttention =
    Number(
      !googleHealthy,
    ) +
    Number(
      !stripeConnected,
    ) +
    Number(
      !mailConfigured,
    );

  const connected =
    Number(
      googleHealthy,
    ) +
    Number(
      stripeConnected,
    ) +
    Number(
      mailConfigured,
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
            External services, platform
            connections and infrastructure
            status in one place.
          </p>
        </div>
      </div>

      <div className={styles.summary}>
        <article className={styles.summaryCard}>
          <span>
            Connected
          </span>

          <strong>
            {connected}
          </strong>

          <small className="sa-note">
            Google, billing and communication
          </small>
        </article>

        <article className={styles.summaryCard}>
          <span>
            Needs attention
          </span>

          <strong>
            {needsAttention}
          </strong>

          <small className="sa-note">
            Connections not fully ready
          </small>
        </article>

        <article className={styles.summaryCard}>
          <span>
            Platform managed
          </span>

          <strong>
            1
          </strong>

          <small className="sa-note">
            Cloudflare infrastructure
          </small>
        </article>
      </div>

      <div className={styles.grid}>
        <section className={`sa-card ${styles.card}`}>
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
                googleHealthy
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
            Analytics and organic search
            reporting for this website.
          </p>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Google Analytics 4
              </span>

              <strong>
                {gaConnected
                  ? "Connected"
                  : "Not connected"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Search Console
              </span>

              <strong>
                {searchConnected
                  ? "Connected"
                  : "Not connected"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
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

          <div className={styles.actions}>
            <Link
              href="/admin/integrations/google"
              className="sa-btn"
            >
              Manage
            </Link>
          </div>
        </section>

        <section className={`sa-card ${styles.card}`}>
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
                  : "warning"
              }
            >
              {stripeConnected
                ? "Connected"
                : "Needs attention"}
            </Status>
          </div>

          <p className="sa-note">
            Subscription, invoices,
            payment methods and billing
            portal.
          </p>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Provider
              </span>

              <strong>
                {subscription
                  ?.provider ??
                  "Unavailable"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
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

          <div className={styles.actions}>
            <Link
              href="/admin/integrations/stripe"
              className="sa-btn"
            >
              Manage
            </Link>
          </div>
        </section>

        <section className={`sa-card ${styles.card}`}>
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
            Transactional email used by
            bookings, notifications and
            automations.
          </p>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Delivery
              </span>

              <strong>
                {mailConfigured
                  ? "Active"
                  : "Not configured"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Transport
              </span>

              <strong>
                Platform managed
              </strong>
            </div>
          </div>

          <div className={styles.actions}>
            <Link
              href="/admin/integrations/email"
              className="sa-btn"
            >
              Manage
            </Link>
          </div>
        </section>

        <section className={`sa-card ${styles.card}`}>
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
            Edge routing, custom hostnames,
            DNS verification and SSL.
          </p>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Custom domains
              </span>

              <strong>
                {customDomains.length}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Fully active
              </span>

              <strong>
                {cloudflareActive}
              </strong>
            </div>
          </div>

          <div className={styles.actions}>
            <Link
              href="/admin/integrations/cloudflare"
              className="sa-btn"
            >
              Manage
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
