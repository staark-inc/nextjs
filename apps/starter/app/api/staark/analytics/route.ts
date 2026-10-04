import {
  NextResponse,
} from "next/server";

import {
  canUsePlanFeature,
} from "@/lib/feature-access";

import {
  getPrismaClient,
} from "@/lib/db/prisma";

import {
  resolveTenantContext,
} from "@/lib/tenant-context";

export const dynamic =
  "force-dynamic";

const MAX_BODY_BYTES =
  2048;

const WINDOW_MS =
  60_000;

const MAX_SITE_WRITES_PER_WINDOW =
  1200;

type RateState = {
  startedAt: number;
  writes: number;
};

const globalForAnalytics =
  globalThis as typeof globalThis & {
    __staarkAnalyticsRates?:
      Map<string, RateState>;
  };

function rates():
Map<string, RateState> {
  if (
    !globalForAnalytics
      .__staarkAnalyticsRates
  ) {
    globalForAnalytics
      .__staarkAnalyticsRates =
      new Map();
  }

  return globalForAnalytics
    .__staarkAnalyticsRates;
}

function allowWrite(
  siteId: string,
): boolean {
  const now =
    Date.now();

  const state =
    rates().get(
      siteId,
    );

  if (
    !state ||
    now - state.startedAt >=
      WINDOW_MS
  ) {
    rates().set(
      siteId,
      {
        startedAt:
          now,

        writes:
          1,
      },
    );

    return true;
  }

  if (
    state.writes >=
      MAX_SITE_WRITES_PER_WINDOW
  ) {
    return false;
  }

  state.writes += 1;

  return true;
}

function utcDateOnly(
  now = new Date(),
): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/setup",
  "/preview",
  "/_next",
] as const;

function validPath(
  value: unknown,
): value is string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.length > 1024 ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return false;
  }

  return !PRIVATE_PATH_PREFIXES.some(
    (prefix) =>
      value === prefix ||
      value.startsWith(`${prefix}/`),
  );
}

function sameOriginBrowser(
  request: Request,
): boolean {
  const fetchSite =
    request.headers.get(
      "sec-fetch-site",
    );

  /*
   * Browsers send this header for fetch(). Reject cross-site browser writes.
   * Some privacy tools may omit it, so Referer is checked as the fallback.
   */
  if (
    fetchSite &&
    fetchSite !== "same-origin"
  ) {
    return false;
  }

  const referer =
    request.headers.get(
      "referer",
    );

  if (!referer) {
    return Boolean(fetchSite);
  }

  try {
    const refererUrl =
      new URL(referer);

    const requestHost =
      (
        request.headers.get(
          "x-forwarded-host",
        ) ??
        request.headers.get(
          "host",
        ) ??
        ""
      )
        .split(",")[0]
        ?.trim()
        .toLowerCase();

    return (
      Boolean(requestHost) &&
      refererUrl.host
        .toLowerCase() ===
        requestHost
    );
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
) {
  try {
    const contentLength =
      Number(
        request.headers.get(
          "content-length",
        ) ?? "0",
      );

    if (
      Number.isFinite(
        contentLength,
      ) &&
      contentLength >
        MAX_BODY_BYTES
    ) {
      return new NextResponse(
        null,
        {
          status: 204,
        },
      );
    }

    if (
      !sameOriginBrowser(
        request,
      )
    ) {
      return new NextResponse(
        null,
        {
          status: 204,
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
      !tenant.publicAccess ||
      !canUsePlanFeature(
        tenant.entitlements,
        "analytics",
      )
    ) {
      return new NextResponse(
        null,
        {
          status: 204,
        },
      );
    }

    if (
      !allowWrite(
        tenant.siteId,
      )
    ) {
      return new NextResponse(
        null,
        {
          status: 204,
        },
      );
    }

    const raw =
      await request
        .json()
        .catch(() => null);

    const path =
      raw &&
      typeof raw ===
        "object" &&
      !Array.isArray(raw)
        ? (
            raw as Record<
              string,
              unknown
            >
          ).path
        : null;

    if (
      !validPath(path)
    ) {
      return new NextResponse(
        null,
        {
          status: 204,
        },
      );
    }

    const prisma =
      getPrismaClient();

    /*
     * Prevent arbitrary-path row amplification.
     * Only a current Page owned by this exact tenant can receive analytics.
     */
    const publication =
      await prisma.pagePublication
        .findFirst({
          where: {
            siteId:
              tenant.siteId,

            path,
          },

          select: {
            pageId: true,
          },
        });

    if (!publication) {
      return new NextResponse(
        null,
        {
          status: 204,
        },
      );
    }

    const date =
      utcDateOnly();

    await prisma
      .analyticsDaily
      .upsert({
        where: {
          siteId_date_path: {
            siteId:
              tenant.siteId,

            date,

            path,
          },
        },

        create: {
          siteId:
            tenant.siteId,

          date,
          path,
          pageViews: 1,
        },

        update: {
          pageViews: {
            increment: 1,
          },
        },
      });

    return new NextResponse(
      null,
      {
        status: 204,

        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "[analytics] Could not record page view:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    return new NextResponse(
      null,
      {
        status: 204,
      },
    );
  }
}
