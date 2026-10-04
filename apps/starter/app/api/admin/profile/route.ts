import {
  NextResponse,
} from "next/server";

import {
  requireClientAccount,
} from "@/lib/account-profile";

export async function GET() {
  try {
    const {
      user,
    } =
      await requireClientAccount();

    return NextResponse.json({
      ok: true,

      profile: {
        name:
          user.name ?? "",
        email:
          user.email,
        twoFactorEnabled:
          user.twoFactorEnabled,
        twoFactorEnabledAt:
          user
            .twoFactorEnabledAt
            ?.toISOString() ??
          null,
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Account profile is not available.",
      },
      {
        status: 403,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      user,
      prisma,
    } =
      await requireClientAccount();

    const body =
      await request.json();

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    if (
      name.length < 2 ||
      name.length > 200
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Name must contain 2–200 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const updated =
      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          name,
        },
      });

    return NextResponse.json({
      ok: true,
      profile: {
        name:
          updated.name ?? "",
        email:
          updated.email,
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not update your profile.",
      },
      {
        status: 403,
      },
    );
  }
}
