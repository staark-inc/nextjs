import Link from "next/link";

import { readAdminSiteSettings } from "@/lib/admin-site-settings";

import PolicyEditor from "../PolicyEditor";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyAdminPage() {
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
            Integritetspolicy
          </h1>

          <p className="sa-subtitle">
            Edit the public privacy policy
            shown to visitors.
          </p>
        </div>

        <Link
          className="sa-btn"
          href={
            site.privacy
              .privacyPolicyPath
          }
          target="_blank"
        >
          View public page ↗
        </Link>
      </div>

      <PolicyEditor
        initial={site.privacy}
        type="privacyPolicy"
      />
    </>
  );
}
