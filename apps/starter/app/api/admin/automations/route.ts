import {
  NextResponse,
} from "next/server";

import {
  createAdminAutomation,
  listAdminAutomations,
} from "@/lib/admin-automations";

import {
  requireAdminMutationOrigin,
  requirePlanFeature,
} from "../guard";

export async function GET() {
  const blocked =
    await requirePlanFeature(
      "automations",
    );

  if (blocked) {
    return blocked;
  }

  return NextResponse.json({
    automations:
      await listAdminAutomations(),
  });
}

export async function POST(
  request: Request,
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

  const body =
    await request
      .json()
      .catch(
        () => null,
      );

  try {
    const automation =
      await createAdminAutomation(
        body,
      );

    return NextResponse.json(
      {
        automation,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create automation.",
      },
      {
        status: 400,
      },
    );
  }
}
