import { NextResponse } from "next/server";
import {
  getInboxSubmission,
  updateInboxSubmission,
  type BookingStatus,
  type InboxStatus,
} from "@/lib/admin-inbox";
import { sendBookingStatusEmail } from "@/lib/booking-email";
import { requireAuth } from "../../guard";

type Ctx = {
  params: Promise<{ id: string }>;
};

const STATUSES: InboxStatus[] = [
  "new",
  "read",
  "replied",
  "archived",
];

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "declined",
];

export async function GET(
  _req: Request,
  ctx: Ctx,
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const item = await getInboxSubmission(id);

  return item
    ? NextResponse.json(item)
    : NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
}

export async function PATCH(
  req: Request,
  ctx: Ctx,
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { id } = await ctx.params;

  const parsed = await req.json().catch(() => null);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = parsed as Record<string, unknown>;

  const status =
    typeof body.status === "string" &&
    STATUSES.includes(body.status as InboxStatus)
      ? (body.status as InboxStatus)
      : undefined;

  const bookingStatus =
    typeof body.bookingStatus === "string" &&
    BOOKING_STATUSES.includes(
      body.bookingStatus as BookingStatus,
    )
      ? (body.bookingStatus as BookingStatus)
      : undefined;

  const activityMessage =
    typeof body.activityMessage === "string"
      ? body.activityMessage
      : undefined;

  if (
    !status &&
    !bookingStatus &&
    !activityMessage
  ) {
    return NextResponse.json(
      { error: "Nothing to update" },
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
    bookingStatus &&
    current.kind !== "booking"
  ) {
    return NextResponse.json(
      {
        error:
          "Booking status can only be updated on booking submissions.",
      },
      { status: 400 },
    );
  }

  const item = await updateInboxSubmission(id, {
    status,
    bookingStatus,
    activityMessage,
  });

  if (!item) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  let notification:
    | { attempted: false }
    | { attempted: true; sent: true; messageId: string }
    | { attempted: true; sent: false; error: string } = {
      attempted: false,
    };

  if (
    bookingStatus &&
    bookingStatus !== "pending" &&
    bookingStatus !== current.bookingStatus
  ) {
    try {
      const result = await sendBookingStatusEmail(
        item,
        bookingStatus,
      );

      if (result) {
        notification = {
          attempted: true,
          sent: true,
          messageId: result.messageId,
        };
      }
    } catch (error) {
      // Booking state is authoritative. A temporary SMTP problem must never
      // roll back a confirmed/declined booking.
      console.error("[booking-email] Could not send status email:", error);
      notification = {
        attempted: true,
        sent: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not send booking email.",
      };
    }
  }

  return NextResponse.json({
    ...item,
    notification,
  });
}
