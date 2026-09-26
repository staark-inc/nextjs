import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SiteSettingsSchema } from "@staark/core";
import { requireAuth } from "../guard";

function sitePath(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  const base = path.isAbsolute(dir) ? dir : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
  return path.join(base, "site.json");
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const raw = await readFile(sitePath(), "utf8");
  return NextResponse.json(JSON.parse(raw));
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

  await writeFile(sitePath(), JSON.stringify(parsed.data, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true, site: parsed.data });
}
