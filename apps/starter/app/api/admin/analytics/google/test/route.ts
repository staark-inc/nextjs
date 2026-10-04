import {
  NextResponse,
} from "next/server";

import {
  requirePlanFeature,
} from "../../../guard";

import {
  googleAnalyticsServiceSummary,
  testGoogleAnalyticsProperty,
} from "@/lib/google-analytics-data";

async function guard() {
  return requirePlanFeature(
    "analytics",
  );
}

export async function POST(
  request: Request,
) {
  const blocked =
    await guard();

  if (blocked) return blocked;

  const body =
    await request
      .json()
      .catch(() => null) as
      | {
          propertyId?: unknown;
        }
      | null;

  const propertyId =
    typeof body?.propertyId ===
      "string"
      ? body.propertyId.trim()
      : "";

  if (!/^\d+$/.test(propertyId)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Enter a valid numeric GA4 Property ID first.",
      },
      { status: 400 },
    );
  }

  const service =
    googleAnalyticsServiceSummary();

  if (!service.configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Analytics Data API credentials are not configured on this runtime.",
      },
      { status: 503 },
    );
  }

  try {
    const result =
      await testGoogleAnalyticsProperty(
        propertyId,
      );

    return NextResponse.json({
      ...result,
      serviceAccount:
        service.clientEmail,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Could not access this GA4 property.",

        serviceAccount:
          service.clientEmail,
      },
      { status: 422 },
    );
  }
}
