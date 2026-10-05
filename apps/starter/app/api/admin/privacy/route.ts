import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { SiteSettingsSchema } from "@staark/core";

import {
  mutateAdminSiteSettings,
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";

import { requireAuth } from "../guard";

import {
  appendAdminAction,
  changedObjectKeys,
} from "@/lib/admin-audit";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const site =
    await readAdminSiteSettings();

  return NextResponse.json(
    site.privacy,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(
  request: Request,
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body =
    await request.json().catch(
      () => null,
    );

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid privacy settings.",
      },
      { status: 400 },
    );
  }

  try {
    const current =
      await readAdminSiteSettings();

    const parsed =
      SiteSettingsSchema.shape.privacy.parse(
        body,
      );

    const saved =
      await mutateAdminSiteSettings(
        (site) =>
          SiteSettingsSchema.parse({
            ...site,
            privacy: parsed,
          }),
      );

    revalidatePath("/", "layout");
    revalidatePath(
      current.privacy
        .privacyPolicyPath,
    );
    revalidatePath(
      current.privacy
        .cookiePolicyPath,
    );
    revalidatePath(
      saved.privacy
        .privacyPolicyPath,
    );
    revalidatePath(
      saved.privacy
        .cookiePolicyPath,
    );

    await appendAdminAction({
      area: "privacy",
      action: "privacy.updated",
      message: "Privacy and consent settings were updated.",
      resource: "site.privacy",
      changedKeys:
        changedObjectKeys(
          current.privacy,
          saved.privacy,
        ),
    });

    return NextResponse.json({
      ok: true,
      privacy: saved.privacy,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save privacy settings.",
      },
      { status: 422 },
    );
  }
}
