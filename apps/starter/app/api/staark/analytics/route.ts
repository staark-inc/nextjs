import { NextResponse } from "next/server";

import { canUsePlanFeature } from "@/lib/feature-access";
import { getPrismaClient } from "@/lib/db/prisma";
import { resolveTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

function utcDateOnly(now = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

function validPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    value.length <= 1024 &&
    !value.startsWith("/admin") &&
    !value.startsWith("/api/")
  );
}

export async function POST(request: Request) {
  try {
    const tenant = await resolveTenantContext({
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
    });

    if (
      !tenant ||
      !tenant.publicAccess ||
      !canUsePlanFeature(
        tenant.entitlements,
        "analytics",
      )
    ) {
      return new NextResponse(null, {
        status: 204,
      });
    }

    const raw =
      await request
        .json()
        .catch(() => null);

    const path =
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw)
        ? (
            raw as Record<
              string,
              unknown
            >
          ).path
        : null;

    if (!validPath(path)) {
      return NextResponse.json(
        {
          error:
            "Invalid analytics path.",
        },
        {
          status: 400,
        },
      );
    }

    const prisma =
      getPrismaClient();

    const date =
      utcDateOnly();

    await prisma.analyticsDaily.upsert({
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

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error(
      "[analytics] Could not record page view:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    return new NextResponse(null, {
      status: 204,
    });
  }
}
