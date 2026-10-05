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

function normalizeOptionalSiteFields(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const body = input as Record<string, unknown>;
  const rawNavigation = body.navigation;

  if (
    !rawNavigation ||
    typeof rawNavigation !== "object" ||
    Array.isArray(rawNavigation)
  ) {
    return input;
  }

  const navigation = rawNavigation as Record<string, unknown>;
  const rawCta = navigation.cta;

  if (
    !rawCta ||
    typeof rawCta !== "object" ||
    Array.isArray(rawCta)
  ) {
    return input;
  }

  const cta = rawCta as Record<string, unknown>;
  const label =
    typeof cta.label === "string" ? cta.label.trim() : "";
  const href =
    typeof cta.href === "string" ? cta.href.trim() : "";

  // Empty optional CTA means "no CTA".
  // Partially completed CTA remains untouched so schema validation
  // can correctly reject it.
  if (label || href) {
    return input;
  }

  const nextNavigation = { ...navigation };
  delete nextNavigation.cta;

  return {
    ...body,
    navigation: nextNavigation,
  };
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    return NextResponse.json(await readAdminSiteSettings());
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Site settings not found." },
      { status: 404 },
    );
  }
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = SiteSettingsSchema.safeParse(normalizeOptionalSiteFields(body));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? issue.path.join(".") : "site";
    return NextResponse.json(
      { error: `${field}: ${issue?.message ?? "Invalid site settings."}` },
      { status: 422 },
    );
  }

  try {
    const before =
      await readAdminSiteSettings();

    // websiteType is provisioned/managed by Staark. The Settings editor may
    // round-trip it, but must never change it locally.
    const site = await mutateAdminSiteSettings((current) =>
      SiteSettingsSchema.parse({
        ...parsed.data,
        websiteType: current.websiteType,
      }),
    );

    revalidatePath("/", "layout");

    await appendAdminAction({
      area: "site",
      action: "site.settings_updated",
      message: "Site settings were updated.",
      resource: "site.settings",
      changedKeys:
        changedObjectKeys(
          before,
          site,
          [
            "updatedAt",
          ],
        ),
    });

    return NextResponse.json({ ok: true, site });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save site settings." },
      { status: 500 },
    );
  }
}
