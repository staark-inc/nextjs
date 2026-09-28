import { NextResponse } from "next/server";
import {
  getInboxSubmission,
  updateInboxSubmission,
  type BookingStatus,
  type InboxStatus,
  type LeadStage,
} from "@/lib/admin-inbox";
import { requireAuth } from "../../guard";

type Ctx = { params: Promise<{ id: string }> };
const STATUSES: InboxStatus[] = ["new", "read", "replied", "archived"];
const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "declined"];
const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "offer_sent",
  "won",
  "lost",
];

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const item = await getInboxSubmission(id);
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Submission not found" }, { status: 404 });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;

  const status = typeof body.status === "string" && STATUSES.includes(body.status as InboxStatus)
    ? (body.status as InboxStatus)
    : undefined;
  const bookingStatus = typeof body.bookingStatus === "string" && BOOKING_STATUSES.includes(body.bookingStatus as BookingStatus)
    ? (body.bookingStatus as BookingStatus)
    : undefined;
  const leadStage =
    typeof body.leadStage === "string" &&
    LEAD_STAGES.includes(body.leadStage as LeadStage)
      ? (body.leadStage as LeadStage)
      : undefined;

  const followUpAt =
    body.followUpAt === null
      ? null
      : typeof body.followUpAt === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(body.followUpAt)
        ? body.followUpAt
        : undefined;

  const internalNote =
    body.internalNote === null
      ? null
      : typeof body.internalNote === "string"
        ? body.internalNote.trim().slice(0, 2000)
        : undefined;

  const activityMessage =
    typeof body.activityMessage === "string"
      ? body.activityMessage
      : undefined;

  const hasFollowUp = Object.prototype.hasOwnProperty.call(body, "followUpAt");
  const hasInternalNote = Object.prototype.hasOwnProperty.call(body, "internalNote");

  if (
    !status &&
    !bookingStatus &&
    !leadStage &&
    !hasFollowUp &&
    !hasInternalNote &&
    !activityMessage
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (
    hasFollowUp &&
    body.followUpAt !== null &&
    followUpAt === undefined
  ) {
    return NextResponse.json(
      { error: "Invalid follow-up date." },
      { status: 400 },
    );
  }

  const current = await getInboxSubmission(id);
  if (!current) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (
    current.kind !== "lead" &&
    (leadStage || hasFollowUp || hasInternalNote)
  ) {
    return NextResponse.json(
      { error: "Lead fields can only be updated on lead submissions." },
      { status: 400 },
    );
  }

  const item = await updateInboxSubmission(id, {
    status,
    bookingStatus,
    leadStage,
    ...(hasFollowUp ? { followUpAt: followUpAt ?? null } : {}),
    ...(hasInternalNote ? { internalNote: internalNote ?? null } : {}),
    activityMessage,
  });
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Submission not found" }, { status: 404 });
}
