import {
  NextResponse,
} from "next/server";

import {
  deleteAdminAutomation,
  updateAdminAutomation,
} from "@/lib/admin-automations";

import {
  requireAdminMutationOrigin,
  requirePlanFeature,
} from "../../guard";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
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

  const {
    id,
  } =
    await context.params;

  const body =
    await request
      .json()
      .catch(
        () => null,
      );

  try {
    const automation =
      await updateAdminAutomation(
        id,
        body,
      );

    if (!automation) {
      return NextResponse.json(
        {
          error:
            "Automation not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      automation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update automation.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
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

  const {
    id,
  } =
    await context.params;

  const deleted =
    await deleteAdminAutomation(
      id,
    );

  return deleted
    ? NextResponse.json({
        ok: true,
      })
    : NextResponse.json(
        {
          error:
            "Automation not found.",
        },
        {
          status: 404,
        },
      );
}
