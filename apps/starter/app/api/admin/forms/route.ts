import { NextResponse } from "next/server";
import { SubmissionKindSchema } from "@staark/core";
import { clearInbox, listInboxSubmissions } from "@/lib/admin-inbox";
import { requireAuth } from "../guard";

export async function GET(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const submissions = await listInboxSubmissions();
  const requested = new URL(req.url).searchParams.get("kind");
  if (!requested) return NextResponse.json(submissions);

  const kind = SubmissionKindSchema.safeParse(requested);
  if (!kind.success) {
    return NextResponse.json({ error: "Unknown submission kind." }, { status: 400 });
  }

  return NextResponse.json(submissions.filter((item) => item.kind === kind.data));
}

export async function DELETE() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  await clearInbox();
  return NextResponse.json({ ok: true });
}
