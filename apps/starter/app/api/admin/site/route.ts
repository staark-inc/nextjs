import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SiteSettingsSchema } from "@staark/core";
import { readContentJson, writeContentJson } from "@/lib/storage";
import { requireAuth } from "../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const site = await readContentJson<unknown>("site.json");
  if (site === null) {
    return NextResponse.json({ error: "Site settings not found." }, { status: 404 });
  }
  return NextResponse.json(site);
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
    return NextResponse.json({ error: `${field}: ${issue?.message ?? "Invalid site settings."}` }, { status: 422 });
  }

  const existing = await readContentJson<unknown>("site.json");
  const existingParsed = SiteSettingsSchema.safeParse(existing);
  const lockedWebsiteType = existingParsed.success
    ? existingParsed.data.websiteType
    : "business";

  const site = {
    ...parsed.data,
    websiteType: lockedWebsiteType,
  };

  await writeContentJson("site.json", site);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, site });
}
