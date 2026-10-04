import {
  NextResponse,
} from "next/server";

import {
  requireClientAccount,
} from "@/lib/account-profile";

import {
  createRecoveryCodes,
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

    if (
      !user.twoFactorPendingSecret
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Start 2FA setup first.",
        },
        {
          status: 409,
        },
      );
    }

    const body =
      await request.json();

    const code =
      typeof body?.code ===
      "string"
        ? body.code
        : "";

    const secret =
      decryptTwoFactorSecret(
        user.twoFactorPendingSecret,
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

    const recovery =
      createRecoveryCodes();

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        twoFactorEnabled:
          true,

        twoFactorSecret:
          user.twoFactorPendingSecret,

        twoFactorPendingSecret:
          null,

        twoFactorRecoveryCodes:
          recovery.hashes,

        twoFactorEnabledAt:
          new Date(),
      },
    });

    return NextResponse.json({
      ok: true,

      recoveryCodes:
        recovery.codes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not enable 2FA.",
      },
      {
        status: 400,
      },
    );
  }
}
