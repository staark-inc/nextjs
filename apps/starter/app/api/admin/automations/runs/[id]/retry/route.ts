import {
  NextResponse,
} from "next/server";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  retryAutomationRun,
} from "@/lib/automation-engine";

import {
  requireAdminMutationOrigin,
  requirePlanFeature,
} from "../../../../guard";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  const blocked =
    await requirePlanFeature(
      "automations",
    );

  if (blocked) {
    return blocked;
  }

  const origin =
    requireAdminMutationOrigin(
      request,
    );

  if (origin) {
    return origin;
  }

  const tenant =
    await requireAdminTenantContext();

  const {
    id,
  } =
    await context.params;

  const retried =
    await retryAutomationRun(
      tenant.siteId,
      id,
    );

  if (!retried) {
    return NextResponse.json(
      {
        error:
          "Failed run not found or retry is not available.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
