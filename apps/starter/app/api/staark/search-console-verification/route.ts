import {
  NextResponse,
} from "next/server";

import {
  readPublicSearchConsoleVerification,
} from "@/lib/search-console-binding";

import {
  resolveTenantContext,
} from "@/lib/tenant-context";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const FILE_NAME =
  /^google[a-zA-Z0-9_-]{8,160}\.html$/;

async function serve(
  request: Request,
): Promise<Response> {
  const url =
    new URL(
      request.url,
    );

  const fileName =
    url.searchParams
      .get(
        "file",
      )
      ?.trim() ??
    "";

  if (
    !FILE_NAME.test(
      fileName,
    )
  ) {
    return new NextResponse(
      null,
      {
        status: 404,
      },
    );
  }

  const tenant =
    await resolveTenantContext({
      host:
        request.headers.get(
          "host",
        ),

      forwardedHost:
        request.headers.get(
          "x-forwarded-host",
        ),
    });

  if (
    !tenant ||
    !tenant.publicAccess
  ) {
    return new NextResponse(
      null,
      {
        status: 404,
      },
    );
  }

  const verification =
    await readPublicSearchConsoleVerification(
      tenant.siteId,
      fileName,
    );

  if (!verification) {
    return new NextResponse(
      null,
      {
        status: 404,
      },
    );
  }

  return new NextResponse(
    request.method === "HEAD"
      ? null
      : verification.content,
    {
      status: 200,

      headers: {
        "content-type":
          `${verification.contentType}; charset=utf-8`,

        "cache-control":
          "public, max-age=300, must-revalidate",

        "x-content-type-options":
          "nosniff",

        "x-robots-tag":
          "noindex, nofollow",
      },
    },
  );
}

export async function GET(
  request: Request,
) {
  return serve(
    request,
  );
}

export async function HEAD(
  request: Request,
) {
  return serve(
    request,
  );
}
