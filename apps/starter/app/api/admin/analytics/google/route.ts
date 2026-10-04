import {
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

import {
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";

import {
  bindGoogleAnalyticsProperty,
  readGoogleAnalyticsBinding,
} from "@/lib/google-analytics-binding";

import {
  testGoogleAnalyticsProperty,
} from "@/lib/google-analytics-data";

import {
  requirePlanFeature,
} from "../../guard";

export async function GET() {
  const blocked =
    await requirePlanFeature(
      "analytics",
    );

  if (blocked) {
    return blocked;
  }

  const tenant =
    await requireAdminTenantContext();

  const site =
    await readAdminSiteSettings();

  return NextResponse.json({
    googleAnalytics:
      await readGoogleAnalyticsBinding(
        tenant.siteId,
      ),

    consent: {
      bannerEnabled:
        site.privacy
          .cookieBannerEnabled,

      analyticsConsentEnabled:
        site.privacy
          .analyticsConsentEnabled,
    },
  });
}

export async function PUT(
  request: Request,
) {
  const blocked =
    await requirePlanFeature(
      "analytics",
    );

  if (blocked) {
    return blocked;
  }

  const tenant =
    await requireAdminTenantContext();

  const site =
    await readAdminSiteSettings();

  const raw =
    await request
      .json()
      .catch(() => null);

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid Google Analytics configuration.",
      },
      {
        status: 400,
      },
    );
  }

  const input =
    raw as Record<
      string,
      unknown
    >;

  const measurementId =
    typeof input.measurementId ===
      "string"
      ? input.measurementId
          .trim()
          .toUpperCase()
      : "";

  const propertyId =
    typeof input.propertyId ===
      "string"
      ? input.propertyId.trim()
      : "";

  const enabled =
    input.enabled === true;

  const consentRequired =
    input.consentRequired !== false;

  if (
    !/^G-[A-Z0-9]+$/.test(
      measurementId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid GA4 Measurement ID.",
      },
      {
        status: 422,
      },
    );
  }

  if (
    !/^\d+$/.test(
      propertyId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid numeric GA4 Property ID.",
      },
      {
        status: 422,
      },
    );
  }

  if (
    enabled &&
    consentRequired &&
    !site.privacy
      .analyticsConsentEnabled
  ) {
    return NextResponse.json(
      {
        error:
          "Enable Analytics consent under Privacy & consent before enabling Google Analytics.",
      },
      {
        status: 422,
      },
    );
  }

  try {
    /*
     * The authenticated tenant may connect its own GA4 property.
     *
     * The siteId is never accepted from the request body: it comes exclusively
     * from the validated tenant context. The property is tested with Google
     * before the binding is committed.
     */
    await testGoogleAnalyticsProperty(
      propertyId,
    );

    const saved =
      await bindGoogleAnalyticsProperty({
        siteId:
          tenant.siteId,

        measurementId,
        propertyId,
        enabled,
        consentRequired,
      });

    revalidatePath(
      "/",
      "layout",
    );

    return NextResponse.json({
      ok: true,

      googleAnalytics:
        saved,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not bind Google Analytics.";

    const duplicate =
      message.includes(
        "Unique constraint",
      ) ||
      message.includes(
        "unique constraint",
      );

    return NextResponse.json(
      {
        error:
          duplicate
            ? "This GA4 Measurement ID or Property ID is already bound to another Staark website."
            : message,
      },
      {
        status: 422,
      },
    );
  }
}
