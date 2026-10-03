import Link from "next/link";

import {
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";
import {
  resolveGoogleAnalyticsSettings,
} from "@/lib/google-analytics-settings";

import GoogleAnalyticsForm from "./GoogleAnalyticsForm";

export const dynamic =
  "force-dynamic";

export default async function GoogleAnalyticsPage() {
  const site =
    await readAdminSiteSettings();

  const ga =
    resolveGoogleAnalyticsSettings(
      site,
    );

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
        analyticsConsentEnabled={
          site.privacy
            .analyticsConsentEnabled
        }
      />
    </>
  );
}
