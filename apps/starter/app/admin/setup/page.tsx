import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminRole } from "@staark/platform/server";

import { getSession, isSessionActive } from "@/lib/auth";
import { resolveFirstSetupState } from "@/lib/first-setup";
import SetupWizard from "./SetupWizard";
import "./setup.css";

export const dynamic = "force-dynamic";

export default async function FirstSetupPage() {
  const session = await getSession();

  if (!isSessionActive(session)) {
    redirect("/admin/login?next=/admin/setup");
  }

  if (resolveAdminRole(session.role) !== "manager") {
    redirect("/admin");
  }

  const requestHeaders = await headers();
  const setup = await resolveFirstSetupState({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
  });

  if (!setup.required) {
    redirect("/admin");
  }

  return (
    <SetupWizard
      siteKey={setup.siteKey}
      publicUrl={setup.publicUrl}
    />
  );
}
