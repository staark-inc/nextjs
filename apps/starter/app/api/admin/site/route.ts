import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SiteSettingsSchema } from "@staark/core";
import {
  mutateAdminSiteSettings,
  readAdminSiteSettings,
} from "@/lib/admin-site-settings";
import { requireAuth } from "../guard";

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

  const parsed = SiteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? issue.path.join(".") : "site";
    return NextResponse.json(
      { error: `${field}: ${issue?.message ?? "Invalid site settings."}` },
      { status: 422 },
    );
  }

  try {
    // websiteType is provisioned/managed by Staark. The Settings editor may
    // round-trip it, but must never change it locally.
    const site = await mutateAdminSiteSettings((current) =>
      SiteSettingsSchema.parse({
        ...parsed.data,
        websiteType: current.websiteType,
      }),
    );

    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, site });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not save site settings." },
      { status: 500 },
    );
  }
}
