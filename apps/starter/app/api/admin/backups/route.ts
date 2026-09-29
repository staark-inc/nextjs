import { NextResponse } from "next/server";
import { createBackup, listBackups } from "@/lib/admin-backups";
import { requireAuth } from "../guard";
import { appendAdminLog } from "@/lib/admin-logs";

export const runtime = "nodejs";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    return NextResponse.json({ backups: await listBackups() });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not load backups." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  let body: { label?: unknown; includeUploads?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Defaults are intentional for an empty or malformed body.
  }

  try {
    const backup = await createBackup(
      typeof body.label === "string" ? body.label : "Manual backup",
      body.includeUploads !== false,
    );

    await appendAdminLog({
      area: "backup",
      action: "backup.created",
      message: "A manual backup was created.",
      meta: {
        includeUploads: body.includeUploads !== false,
        label:
          typeof body.label === "string"
            ? body.label
            : "Manual backup",
      },
    });

    return NextResponse.json(
      { ok: true, backup },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not create backup." },
      { status: 500 },
    );
  }
}
