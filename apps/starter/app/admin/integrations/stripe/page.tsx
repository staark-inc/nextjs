import Link from "next/link";

import {
  readAdminBillingStatus,
} from "@/lib/admin-billing";

import {
  readAdminPlanSummary,
} from "@/lib/admin-plan";

import BillingPortalButton from "../../plan/BillingPortalButton";
import styles from "../integrations.module.css";

export const dynamic =
  "force-dynamic";

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
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
    },
  ).format(
    new Date(
      value,
    ),
  );
}

export default async function StripeIntegrationPage() {
  const [
    billing,
    plan,
  ] =
    await Promise.all([
      readAdminBillingStatus(),
      readAdminPlanSummary(),
    ]);

  const connected =
    billing.configured &&
    billing.customerAttached &&
    billing.subscriptionAttached;

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Integrations / Stripe
          </p>

          <h1 className="sa-h1">
            Stripe
          </h1>

          <p className="sa-subtitle">
            Billing connection, subscription
            status and secure customer portal.
          </p>
        </div>

        <Link
          href="/admin/integrations"
          className="sa-btn"
        >
          ← Integrations
        </Link>
      </div>

      <div className={styles.detailGrid}>
        <section className={`sa-card ${styles.detailCard}`}>
          <div className="sa-card__header sa-card__header--row">
            <div>
              <p className="sa-card__eyebrow">
                Connection
              </p>

              <h2>
                Billing provider
              </h2>
            </div>

            <span
              className={`sa-plan-status ${
                connected
                  ? "sa-plan-status--success"
                  : "sa-plan-status--warning"
              }`}
            >
              {connected
                ? "Connected"
                : "Needs attention"}
            </span>
          </div>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Runtime billing
              </span>

              <strong>
                {billing.configured
                  ? "Configured"
                  : "Unavailable"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Customer
              </span>

              <strong>
                {billing.customerAttached
                  ? "Attached"
                  : "Not attached"}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Subscription
              </span>

              <strong>
                {billing.subscriptionAttached
                  ? "Attached"
                  : "Not attached"}
              </strong>
            </div>
          </div>
        </section>

        <section className={`sa-card ${styles.detailCard}`}>
          <div className="sa-card__header">
            <p className="sa-card__eyebrow">
              Subscription
            </p>

            <h2>
              {plan.planName}
            </h2>
          </div>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Status
              </span>

              <strong>
                {plan.subscriptionStatus}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Billing cycle
              </span>

              <strong>
                {plan.billingInterval}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Current period ends
              </span>

              <strong>
                {formatDate(
                  plan.currentPeriodEnd,
                )}
              </strong>
            </div>
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
            Stripe customer portal
          </p>

          <strong>
            Manage billing securely
          </strong>

          <span>
            Payment methods, invoices,
            cancellation and supported
            subscription changes are handled
            in Stripe&apos;s secure portal.
          </span>
        </div>

        <BillingPortalButton />
      </section>

      <div
        className={styles.actions}
        style={{
          marginTop:
            16,
        }}
      >
        <Link
          href="/admin/plan"
          className="sa-btn sa-btn--ghost"
        >
          View plan & usage
        </Link>
      </div>
    </>
  );
}
