import {
  renderEmailTemplate,
  sendMail,
  type StaarkMailResult,
} from "@staark/platform/server";
import type { SiteSettings } from "@staark/core";

import type {
  BookingStatus,
  InboxSubmission,
} from "./admin-inbox";
import { readAdminSiteSettings } from "./admin-site-settings";

function text(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function customerEmail(submission: InboxSubmission): string {
  return text(submission.fields, "email");
}

function senderName(settings: SiteSettings): string {
  return settings.email.fromName?.trim() || settings.name;
}

function replyTo(settings: SiteSettings): string | undefined {
  return (
    settings.email.replyTo?.trim() ||
    settings.contact.email?.trim() ||
    undefined
  );
}

function isEnabled(
  settings: SiteSettings,
  status: BookingStatus,
): boolean {
  if (status === "confirmed") {
    return settings.email.bookingConfirmationEnabled;
  }
  if (status === "declined") {
    return settings.email.bookingDeclineEnabled;
  }
  return false;
}

function bookingSubject(
  status: BookingStatus,
  siteName: string,
): string {
  return status === "confirmed"
    ? `Booking confirmed - ${siteName}`
    : `Booking update - ${siteName}`;
}

function bookingIntro(
  status: BookingStatus,
): string {
  return status === "confirmed"
    ? "Your booking has been confirmed."
    : "Unfortunately, this booking request has been declined.";
}

export async function sendBookingStatusEmail(
  submission: InboxSubmission,
  status: BookingStatus,
): Promise<StaarkMailResult | null> {
  if (status === "pending") return null;

  const settings = await readAdminSiteSettings();
  if (!isEnabled(settings, status)) return null;

  const to = customerEmail(submission);
  if (!to) return null;

  const rows = [
    { label: "Date", value: text(submission.fields, "booking_date") },
    { label: "Time", value: text(submission.fields, "booking_time") },
    { label: "Service", value: text(submission.fields, "booking_item") },
    { label: "Booking type", value: text(submission.fields, "booking_type") },
    { label: "Guests", value: text(submission.fields, "booking_guests") },
    { label: "Reference", value: submission.id },
  ].filter((row) => row.value);

  const rendered = renderEmailTemplate({
    siteName: settings.name,
    eyebrow: "Booking",
    title: status === "confirmed" ? "Booking confirmed" : "Booking declined",
    intro: bookingIntro(status),
    rows,
    footer: `${settings.name} - Powered by Staark`,
  });

  const configuredReplyTo = replyTo(settings);

  return sendMail({
    to,
    subject: bookingSubject(status, settings.name),
    text: rendered.text,
    html: rendered.html,
    fromName: senderName(settings),
    ...(configuredReplyTo ? { replyTo: configuredReplyTo } : {}),
  });
}
