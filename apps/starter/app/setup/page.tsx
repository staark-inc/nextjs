import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import SetupWizard from "@/app/admin/setup/SetupWizard";
import "@/app/admin/setup/setup.css";
import { resolveFirstSetupState } from "@/lib/first-setup";
import {
  SETUP_CLAIM_COOKIE,
  validateSetupSession,
} from "@/lib/setup-claim";

export const dynamic = "force-dynamic";

export default async function PublicSetupPage() {
  const requestHeaders = await headers();
  const requestTenant = {
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
  };
  const setup = await resolveFirstSetupState(requestTenant);

  if (!setup.required) redirect("/admin");

  const cookieStore = await cookies();
  const claim = await validateSetupSession(
    requestTenant,
    cookieStore.get(SETUP_CLAIM_COOKIE)?.value,
  );

  // Deliberately hide the existence of an unclaimed setup surface.
  if (!claim) notFound();

  return (
    <SetupWizard
      siteKey={setup.siteKey}
      publicUrl={setup.publicUrl}
      endpoint="/api/setup"
      ownerRequired
    />
  );
}
