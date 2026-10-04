import QRCode from "qrcode";
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
  createOtpAuthUri,
  encryptTwoFactorSecret,
  generateTotpSecret,
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
      user.twoFactorEnabled
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Two-factor authentication is already enabled.",
        },
        {
          status: 409,
        },
      );
    }

    const secret =
      generateTotpSecret();

    const uri =
      createOtpAuthUri({
        account:
          user.email,
        secret,
      });

    const qrDataUrl =
      await QRCode.toDataURL(
        uri,
        {
          margin: 1,
          width: 260,
        },
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        twoFactorPendingSecret:
          encryptTwoFactorSecret(
            secret,
          ),
      },
    });

    return NextResponse.json({
      ok: true,
      secret,
      uri,
      qrDataUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not start 2FA setup.",
      },
      {
        status: 400,
      },
    );
  }
}
