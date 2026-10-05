import {
  NextResponse,
} from "next/server";

import {
  listAdminAutomationRuns,
} from "@/lib/admin-automations";

import {
  requirePlanFeature,
} from "../../guard";

export async function GET() {
  const blocked =
    await requirePlanFeature(
      "automations",
    );

  if (blocked) {
    return blocked;
  }

  return NextResponse.json({
    runs:
      await listAdminAutomationRuns(),
  });
}
