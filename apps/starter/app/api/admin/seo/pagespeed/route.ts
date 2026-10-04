import {
  NextResponse,
} from "next/server";

import {
  getPlanFeatureAccess,
} from "@/lib/feature-access";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  requirePlanFeature,
} from "../../guard";

import {
  createPostgresRepositories,
} from "@/lib/repositories";

import {
  runPageSpeed,
  pageSpeedServiceSummary,
  type PageSpeedStrategy,
} from "@/lib/google-pagespeed";

export const dynamic =
  "force-dynamic";

function validPath(
  value: string,
): boolean {
  return (
    value.startsWith("/") &&
    value.length <= 1024 &&
    !value.includes("?") &&
    !value.includes("#") &&
    !value.startsWith("//")
  );
}

function validStrategy(
  value: string | null,
): value is PageSpeedStrategy {
  return (
    value === "mobile" ||
    value === "desktop"
  );
}

export async function GET(
  request: Request,
) {
  const blocked =
    await requirePlanFeature(
      "seo",
    );

  if (blocked) {
    return blocked;
  }

  try {
    const tenant =
      await requireAdminTenantContext();

    const access =
      getPlanFeatureAccess(
        tenant.entitlements,
        "seo",
      );

    const requestUrl =
      new URL(
        request.url,
      );

    const path =
      requestUrl.searchParams.get(
        "path",
      ) ?? "/";

    const rawStrategy =
      requestUrl.searchParams.get(
        "strategy",
      );

    const strategy:
      PageSpeedStrategy =
        validStrategy(
          rawStrategy,
        )
          ? rawStrategy
          : "mobile";

    if (!validPath(path)) {
      return NextResponse.json(
        {
          error:
            "Invalid page path.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Starter/basic:
     * homepage mobile audit only.
     *
     * Full/advanced:
     * any published page,
     * mobile or desktop.
     */
    if (
      access.level === "basic" &&
      (
        path !== "/" ||
        strategy !== "mobile"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The current SEO package includes PageSpeed for the homepage on mobile only.",
          code:
            "SEO_FULL_REQUIRED",
        },
        {
          status: 403,
        },
      );
    }

    const repositories =
      createPostgresRepositories();

    const publication =
      await repositories
        .publications
        .findByPath(
          tenant.siteId,
          path,
        );

    if (!publication) {
      return NextResponse.json(
        {
          error:
            "Only published pages can be audited.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !tenant.hostname ||
      tenant.hostname ===
        "localhost" ||
      tenant.hostname.startsWith(
        "127.",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "PageSpeed requires a publicly reachable tenant hostname.",
        },
        {
          status: 400,
        },
      );
    }

    const target =
      `https://${tenant.hostname}${
        path === "/"
          ? "/"
          : path
      }`;

    const service =
      pageSpeedServiceSummary();

    const result =
      await runPageSpeed({
        url:
          target,

        strategy,
      });

    return NextResponse.json(
      {
        service,
        plan: {
          level:
            access.level,
        },
        result,
      },
      {
        headers: {
          "cache-control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PageSpeed audit failed.",
      },
      {
        status: 502,
      },
    );
  }
}
