import {
  NextResponse,
} from "next/server";

import {
  requireClientAccount,
} from "@/lib/account-profile";

import {
  hashPassword,
  verifyPassword,
} from "@/lib/password";

export async function POST(
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

    const currentPassword =
      typeof body?.currentPassword ===
      "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body?.newPassword ===
      "string"
        ? body.newPassword
        : "";

    if (
      !user.passwordHash ||
      !(
        await verifyPassword(
          currentPassword,
          user.passwordHash,
        )
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Current password is incorrect.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Choose a password different from your current password.",
        },
        {
          status: 400,
        },
      );
    }

    const passwordHash =
      await hashPassword(
        newPassword,
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not change password.",
      },
      {
        status: 400,
      },
    );
  }
}
