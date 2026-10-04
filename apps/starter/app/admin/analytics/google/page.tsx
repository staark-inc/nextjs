import Link from "next/link";

import {
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";
import {
  readGoogleAnalyticsBinding,
} from "@/lib/google-analytics-binding";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  getSession,
} from "@/lib/auth";

import {
  resolveAdminRole,
} from "@staark/platform/server";
import {
  googleAnalyticsServiceSummary,
} from "@/lib/google-analytics-data";

import GoogleAnalyticsForm from "./GoogleAnalyticsForm";

export const dynamic =
  "force-dynamic";

export default async function GoogleAnalyticsPage() {
  const site =
    await readAdminSiteSettings();

  const tenant =
    await requireAdminTenantContext();

  const ga =
    await readGoogleAnalyticsBinding(
      tenant.siteId,
    );

  const session =
    await getSession();

  const editable =
    resolveAdminRole(
      session.role,
    ) === "manager";

  const service =
    googleAnalyticsServiceSummary();

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Analytics / Google
          </p>

          <h1 className="sa-h1">
            Google Analytics
          </h1>

          <p className="sa-subtitle">
            Connect this website to its own
            Google Analytics 4 data stream.
          </p>
        </div>

        <div className="sa-analytics-google-header">
          <span
            className={
              ga.enabled &&
              ga.measurementId
                ? "sa-analytics-google-status sa-analytics-google-status--connected"
                : "sa-analytics-google-status"
            }
          >
            {ga.enabled &&
            ga.measurementId
              ? "Configured"
              : "Not configured"}
          </span>

          <Link
            className="sa-btn"
            href="/admin/analytics"
          >
            ← Analytics
          </Link>
        </div>
      </div>

      <GoogleAnalyticsForm
        initial={ga}
        editable={editable}
        analyticsConsentEnabled={
          site.privacy
            .analyticsConsentEnabled
        }
        dataApiConfigured={
          service.configured
        }
        serviceAccountEmail={
          service.clientEmail
        }
      />
    </>
  );
}
