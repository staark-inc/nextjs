import {
  NextResponse,
} from "next/server";
import {
  revalidatePath,
} from "next/cache";

import {
  SiteSettingsSchema,
} from "@staark/core";

import {
  mutateAdminSiteSettings,
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";
import {
  resolveGoogleAnalyticsSettings,
} from "@/lib/google-analytics-settings";

import {
  requireAuth,
  requirePlanFeature,
} from "../../guard";

async function guard() {
  const auth =
    await requireAuth();

  if (auth) return auth;

  return requirePlanFeature(
    "analytics",
  );
}

export async function GET() {
  const blocked =
    await guard();

  if (blocked) return blocked;

  const site =
    await readAdminSiteSettings();

  return NextResponse.json({
    googleAnalytics:
      resolveGoogleAnalyticsSettings(
        site,
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
    await guard();

  if (blocked) return blocked;

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
      { status: 400 },
    );
  }

  try {
    const current =
      await readAdminSiteSettings();

    const parsed =
      SiteSettingsSchema.parse({
        ...current,

        analytics: {
          ...(current.analytics ?? {}),

          googleAnalytics: raw,
        },
      }).analytics.googleAnalytics;

    if (
      parsed.enabled &&
      !parsed.measurementId
    ) {
      return NextResponse.json(
        {
          error:
            "A Measurement ID is required when Google Analytics is enabled.",
        },
        { status: 422 },
      );
    }

    if (
      parsed.enabled &&
      parsed.consentRequired &&
      !current.privacy
        .analyticsConsentEnabled
    ) {
      return NextResponse.json(
        {
          error:
            "Enable Analytics consent under Privacy & consent before enabling Google Analytics.",
        },
        { status: 422 },
      );
    }

    const saved =
      await mutateAdminSiteSettings(
        (site) =>
          SiteSettingsSchema.parse({
            ...site,

            analytics: {
              ...(site.analytics ?? {}),

              googleAnalytics:
                parsed,
            },
          }),
      );

    revalidatePath(
      "/",
      "layout",
    );

    return NextResponse.json({
      ok: true,

      googleAnalytics:
        saved.analytics
          .googleAnalytics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save Google Analytics settings.",
      },
      { status: 422 },
    );
  }
}
