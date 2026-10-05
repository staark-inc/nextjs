import Link from "next/link";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  getPrismaClient,
} from "@/lib/db/prisma";

import styles from "../integrations.module.css";

export const dynamic =
  "force-dynamic";

function formatDate(
  value: Date | null,
): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(value);
}

export default async function CloudflareIntegrationPage() {
  const tenant =
    await requireAdminTenantContext();

  const domains =
    await getPrismaClient()
      .domain
      .findMany({
        where: {
          siteId:
            tenant.siteId,

          releasedAt:
            null,
        },

        orderBy: [
          {
            primaryDomain:
              "desc",
          },

          {
            hostname:
              "asc",
          },
        ],

        select: {
          id:
            true,

          hostname:
            true,

          type:
            true,

          verified:
            true,

          primaryDomain:
            true,

          provider:
            true,

          providerStatus:
            true,

          providerError:
            true,

          sslStatus:
            true,

          providerLastSyncAt:
            true,
        },
      });

  const custom =
    domains.filter(
      (domain) =>
        domain.type ===
        "custom",
    );

  const active =
    custom.filter(
      (domain) =>
        domain.verified &&
        domain.providerStatus ===
          "active" &&
        domain.sslStatus ===
          "active",
    ).length;

  const pending =
    custom.length -
    active;

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Integrations / Cloudflare
          </p>

          <h1 className="sa-h1">
            Cloudflare
          </h1>

          <p className="sa-subtitle">
            Managed edge routing, custom
            hostnames, verification and SSL
            status.
          </p>
        </div>

        <Link
          href="/admin/integrations"
          className="sa-btn"
        >
          ← Integrations
        </Link>
      </div>

      <div className={styles.summary}>
        <article className={styles.summaryCard}>
          <span>
            Custom domains
          </span>

          <strong>
            {custom.length}
          </strong>

          <small className="sa-note">
            Connected to this tenant
          </small>
        </article>

        <article className={styles.summaryCard}>
          <span>
            Fully active
          </span>

          <strong>
            {active}
          </strong>

          <small className="sa-note">
            Routing + verification + SSL
          </small>
        </article>

        <article className={styles.summaryCard}>
          <span>
            Pending
          </span>

          <strong>
            {pending}
          </strong>

          <small className="sa-note">
            Domains requiring propagation
          </small>
        </article>
      </div>

      <section className={`sa-card ${styles.detailCard}`}>
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">
              Infrastructure
            </p>

            <h2>
              Domain routing
            </h2>
          </div>

          <span className="sa-plan-status sa-plan-status--success">
            Managed by Staark
          </span>
        </div>

        <div className={styles.notice}>
          Staark provisions Cloudflare
          hostname routing and SSL
          automatically. DNS records remain
          visible in Domains so customers
          can complete ownership and routing
          verification when required.
        </div>

        {domains.length ? (
          <div className={styles.domainList}>
            {domains.map(
              (domain) => {
                const connected =
                  domain.type ===
                    "platform" ||
                  (
                    domain.verified &&
                    domain.providerStatus ===
                      "active" &&
                    domain.sslStatus ===
                      "active"
                  );

                return (
                  <article
                    className={styles.domain}
                    key={
                      domain.id
                    }
                  >
                    <div className={styles.domainIdentity}>
                      <strong>
                        {domain.hostname}
                      </strong>

                      <span>
                        {domain.type ===
                        "platform"
                          ? "Staark platform domain"
                          : domain.primaryDomain
                            ? "Primary custom domain"
                            : "Custom domain"}
                      </span>

                      {domain.providerError ? (
                        <span>
                          {domain.providerError}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.domainMeta}>
                      <span
                        className={`sa-plan-status ${
                          connected
                            ? "sa-plan-status--success"
                            : "sa-plan-status--warning"
                        }`}
                      >
                        {connected
                          ? "Active"
                          : "Pending"}
                      </span>

                      <span>
                        Provider:{" "}
                        {domain.provider ??
                          "platform"}
                      </span>

                      <span>
                        Routing:{" "}
                        {domain.providerStatus ??
                          "managed"}
                      </span>

                      <span>
                        SSL:{" "}
                        {domain.sslStatus}
                      </span>

                      <span>
                        Last sync:{" "}
                        {formatDate(
                          domain.providerLastSyncAt,
                        )}
                      </span>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <p className="sa-note">
            No domain records are attached to
            this website.
          </p>
        )}

        <div className={styles.actions}>
          <Link
            href="/admin/domains"
            className="sa-btn"
          >
            Manage domains
          </Link>
        </div>
      </section>
    </>
  );
}
