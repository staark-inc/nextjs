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

      <PrivacySettingsForm
        initial={site.privacy}
      />
    </>
  );
}
