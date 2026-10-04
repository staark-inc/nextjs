import {
  NextResponse,
} from "next/server";

import {
  requireClientAccount,
} from "@/lib/account-profile";

import {
  verifyPassword,
} from "@/lib/password";

import {
  decryptTwoFactorSecret,
  verifyTotp,
} from "@/lib/two-factor";

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

    const code =
      typeof body?.code ===
      "string"
        ? body.code
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
      !user.twoFactorEnabled ||
      !user.twoFactorSecret
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Two-factor authentication is not enabled.",
        },
        {
          status: 409,
        },
      );
    }

    const secret =
      decryptTwoFactorSecret(
        user.twoFactorSecret,
      );

    if (
      !verifyTotp(
        secret,
        code,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The authentication code is not valid.",
        },
        {
          status: 400,
        },
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        twoFactorEnabled:
          false,

        twoFactorSecret:
          null,

        twoFactorPendingSecret:
          null,

        twoFactorRecoveryCodes:
          [],

        twoFactorEnabledAt:
          null,
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
            : "Could not disable 2FA.",
      },
      {
        status: 400,
      },
    );
  }
}
