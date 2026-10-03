import Link from "next/link";
import { readAdminSiteSettings } from "@/lib/admin-site-settings";

import PrivacySettingsForm from "./PrivacySettingsForm";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const site =
    await readAdminSiteSettings();

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Privacy
          </p>

          <h1 className="sa-h1">
            Privacy & consent
          </h1>

          <p className="sa-subtitle">
            Manage the cookie banner,
            visitor consent and public
            privacy pages for this website.
          </p>
        </div>
      </div>

      <div className="sa-privacy-policy-links">
        <Link
          href="/admin/privacy/integritet"
          className="sa-card sa-privacy-policy-card"
        >
          <div>
            <p className="sa-card__eyebrow">
              Public page
            </p>

            <h2>
              Integritetspolicy
            </h2>

            <span>
              Edit privacy information,
              processing and visitor rights.
            </span>
          </div>

          <strong>Open →</strong>
        </Link>

        <Link
          href="/admin/privacy/cookies"
          className="sa-card sa-privacy-policy-card"
        >
          <div>
            <p className="sa-card__eyebrow">
              Public page
            </p>

            <h2>
              Cookiepolicy
            </h2>

            <span>
              Edit cookies, analytics and
              consent information.
            </span>
          </div>

          <strong>Open →</strong>
        </Link>
      </div>

      <PrivacySettingsForm
        initial={site.privacy}
      />
    </>
  );
}
