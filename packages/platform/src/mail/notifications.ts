import type { SubmissionKind } from "@staark/core";
import { sendMail, type StaarkMailResult } from "./transport.ts";
import { renderEmailTemplate } from "./template.ts";

export type SubmissionNotificationInput = {
  kind: SubmissionKind;
  formId: string;
  fields: Record<string, unknown>;
  pageUrl?: string;
  siteName: string;
  to: string;
  inboxUrl?: string;
  receivedAt?: string;
};

type FieldDefinition = {
  key: string;
  label: string;
};

const COMMON_FIELDS: FieldDefinition[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

const BOOKING_FIELDS: FieldDefinition[] = [
  { key: "booking_date", label: "Date" },
  { key: "booking_time", label: "Time" },
  { key: "booking_item", label: "Service" },
  { key: "booking_type", label: "Booking type" },
];

function textField(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function titleFor(kind: SubmissionKind): string {
  if (kind === "booking") return "New booking request";
  if (kind === "lead") return "New lead";
  return "New message";
}

function subjectFor(kind: SubmissionKind, siteName: string): string {
  if (kind === "booking") return `New booking request - ${siteName}`;
  if (kind === "lead") return `New lead - ${siteName}`;
  return `New enquiry - ${siteName}`;
}

export function renderSubmissionNotification(input: SubmissionNotificationInput) {
  const definitions = [
    ...COMMON_FIELDS,
    ...(input.kind === "booking" ? BOOKING_FIELDS : []),
  ];

  const rows = definitions
    .map(({ key, label }) => ({ label, value: textField(input.fields, key) }))
    .filter((row) => row.value);

  if (input.pageUrl) rows.push({ label: "Source page", value: input.pageUrl });
  rows.push({ label: "Submission type", value: input.kind });
  rows.push({ label: "Form", value: input.formId });
  rows.push({
    label: "Received",
    value: input.receivedAt ?? new Date().toISOString(),
  });

  const message =
    textField(input.fields, "message") ||
    textField(input.fields, "subject") ||
    undefined;

  const rendered = renderEmailTemplate({
    siteName: input.siteName,
    eyebrow: input.kind === "booking" ? "Booking" : input.kind === "lead" ? "Lead" : "Inbox",
    title: titleFor(input.kind),
    intro: `A new ${input.kind} submission arrived from ${input.siteName}.`,
    rows,
    ...(message ? { message } : {}),
    ...(input.inboxUrl
      ? { action: { label: "Open inbox", href: input.inboxUrl } }
      : {}),
  });

  const replyTo = textField(input.fields, "email") || undefined;

  return {
    subject: subjectFor(input.kind, input.siteName),
    ...(replyTo ? { replyTo } : {}),
    ...rendered,
  };
}

export async function sendSubmissionNotification(
  input: SubmissionNotificationInput,
): Promise<StaarkMailResult> {
  const rendered = renderSubmissionNotification(input);

  return sendMail({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
  });
}
