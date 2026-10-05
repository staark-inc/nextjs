import Link from "next/link";

import {
  MailConfigurationError,
  summarizeMailConfig,
} from "@staark/platform/server";

import {
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";

import EmailTestButton from "./EmailTestButton";
import styles from "../integrations.module.css";

export const dynamic =
  "force-dynamic";

export default async function EmailIntegrationPage() {
  const site =
    await readAdminSiteSettings();

  let configured =
    false;

  let transport =
    "disabled";

  try {
    const mail =
      summarizeMailConfig();

    configured =
      mail.configured;

    transport =
      mail.transport;
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
        "[staark] Could not resolve mail integration:",
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

  const notificationEmail =
    site.email.notificationEmail?.trim() ||
    site.contact.email?.trim() ||
    "Not configured";

  const replyTo =
    site.email.replyTo?.trim() ||
    site.contact.email?.trim() ||
    "Not configured";

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Integrations / Email
          </p>

          <h1 className="sa-h1">
            Email / SMTP
          </h1>

          <p className="sa-subtitle">
            Transactional email delivery,
            sender identity and website
            notification status.
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
                Delivery
              </p>

              <h2>
                SMTP transport
              </h2>
            </div>

            <span
              className={`sa-plan-status ${
                configured
                  ? "sa-plan-status--success"
                  : "sa-plan-status--warning"
              }`}
            >
              {configured
                ? "Configured"
                : "Unavailable"}
            </span>
          </div>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Transport
              </span>

              <strong>
                {transport}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Management
              </span>

              <strong>
                Managed by Staark
              </strong>
            </div>
          </div>

          <div className={styles.notice}>
            SMTP host, credentials and
            transport secrets stay on the
            platform and are never exposed
            to client accounts.
          </div>
        </section>

        <section className={`sa-card ${styles.detailCard}`}>
          <div className="sa-card__header">
            <p className="sa-card__eyebrow">
              Website identity
            </p>

            <h2>
              Email destinations
            </h2>
          </div>

          <div className={styles.serviceRows}>
            <div className={styles.serviceRow}>
              <span>
                Sender name
              </span>

              <strong>
                {site.email.fromName?.trim() ||
                  site.name}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Reply-to
              </span>

              <strong>
                {replyTo}
              </strong>
            </div>

            <div className={styles.serviceRow}>
              <span>
                Notifications
              </span>

              <strong>
                {notificationEmail}
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
            Delivery test
          </p>

          <strong>
            Verify email delivery
          </strong>

          <span>
            Send a real test message using
            the same platform transport used
            by website notifications.
          </span>
        </div>

        {configured ? (
          <EmailTestButton />
        ) : (
          <span className="sa-plan-status sa-plan-status--warning">
            Transport unavailable
          </span>
        )}
      </section>

      <div
        className={styles.actions}
        style={{
          marginTop:
            16,
        }}
      >
        <Link
          href="/admin/site#email"
          className="sa-btn"
        >
          Email settings
        </Link>
      </div>
    </>
  );
}
