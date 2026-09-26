import { NextResponse } from "next/server";
import {
  getInboxSubmission,
  updateInboxSubmission,
  type BookingStatus,
  type InboxStatus,
} from "@/lib/admin-inbox";
import { requireAuth } from "../../guard";

type Ctx = { params: Promise<{ id: string }> };
const STATUSES: InboxStatus[] = ["new", "read", "replied", "archived"];
const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "declined"];

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
  const activityMessage = typeof body.activityMessage === "string" ? body.activityMessage : undefined;

  if (!status && !bookingStatus && !activityMessage) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const item = await updateInboxSubmission(id, { status, bookingStatus, activityMessage });
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Submission not found" }, { status: 404 });
}
