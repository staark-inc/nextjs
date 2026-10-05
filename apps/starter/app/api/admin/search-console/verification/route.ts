import {
  NextResponse,
} from "next/server";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  deleteSearchConsoleVerification,
  saveSearchConsoleVerification,
  SearchConsoleBindingConflictError,
} from "@/lib/search-console-binding";

import {
  normalizeSearchConsoleSiteUrl,
  searchConsolePropertyType,
  searchConsoleVerificationUrl,
} from "@/lib/search-console-property";

import {
  requireAdminMutationOrigin,
  requirePlanFeature,
} from "../../guard";

const MAX_FILE_BYTES =
  4096;

const FILE_NAME =
  /^google[a-zA-Z0-9_-]{8,160}\.html$/;

function normalizedContentType(
  value: string,
): string {
  const raw =
    value
      .split(";")[0]
      ?.trim()
      .toLowerCase();

  if (
    raw === "text/plain"
  ) {
    return "text/plain";
  }

  return "text/html";
}

export async function POST(
  request: Request,
) {
  const blocked =
    await requirePlanFeature(
      "searchConsole",
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

  const form =
    await request
      .formData()
      .catch(
        () => null,
      );

  if (!form) {
    return NextResponse.json(
      {
        error:
          "Invalid verification upload.",
      },
      {
        status: 400,
      },
    );
  }

  const siteUrl =
    normalizeSearchConsoleSiteUrl(
      form.get(
        "siteUrl",
      ),
    );

  if (!siteUrl) {
    return NextResponse.json(
      {
        error:
          "Enter a valid URL-prefix Search Console property first.",
      },
      {
        status: 422,
      },
    );
  }

  if (
    searchConsolePropertyType(
      siteUrl,
    ) !== "url-prefix"
  ) {
    return NextResponse.json(
      {
        error:
          "Domain properties use DNS verification. HTML file verification is only available for URL-prefix properties.",
      },
      {
        status: 422,
      },
    );
  }

  const upload =
    form.get(
      "file",
    );

  if (
    !(upload instanceof File)
  ) {
    return NextResponse.json(
      {
        error:
          "Choose the Google verification HTML file.",
      },
      {
        status: 422,
      },
    );
  }

  if (
    !FILE_NAME.test(
      upload.name,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Google verification filename must look like googleXXXXXXXX.html.",
      },
      {
        status: 422,
      },
    );
  }

  if (
    upload.size <= 0 ||
    upload.size >
      MAX_FILE_BYTES
  ) {
    return NextResponse.json(
      {
        error:
          "Verification file must be between 1 byte and 4 KB.",
      },
      {
        status: 422,
      },
    );
  }

  const content =
    await upload.text();

  const expected =
    `google-site-verification: ${upload.name}`;

  if (
    content.trim() !==
    expected
  ) {
    return NextResponse.json(
      {
        error:
          "The file content does not match its Google verification filename.",
      },
      {
        status: 422,
      },
    );
  }

  const contentType =
    normalizedContentType(
      upload.type,
    );

  try {
    const binding =
      await saveSearchConsoleVerification({
        siteId:
          tenant.siteId,

        siteUrl,

        fileName:
          upload.name,

        content,

        contentType,
      });

    return NextResponse.json({
      ok:
        true,

      binding,

      verificationUrl:
        searchConsoleVerificationUrl(
          siteUrl,
          upload.name,
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save Search Console verification.",
      },
      {
        status:
          error instanceof SearchConsoleBindingConflictError
            ? 409
            : 400,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  const blocked =
    await requirePlanFeature(
      "searchConsole",
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

  await deleteSearchConsoleVerification(
    tenant.siteId,
  );

  return NextResponse.json({
    ok: true,
  });
}
