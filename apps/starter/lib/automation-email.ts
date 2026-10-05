import {
  renderEmailTemplate,
  sendMail,
  type StaarkMailResult,
} from "@staark/platform/server";

import type {
  AutomationEvent,
} from "./automation-types";

import {
  readAdminSiteSettings,
} from "./admin-site-settings";

function fieldText(
  event: AutomationEvent,
  key: string,
): string {
  const value =
    event.submission.fields[key];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(
      value,
    );
  }

  return "";
}

function renderVariables(
  template: string,
  event: AutomationEvent,
): string {
  const values:
    Record<string, string> = {
      submissionId:
        event.submission.id,

      kind:
        event.submission.kind,

      status:
        event.submission.status,

      bookingStatus:
        event.submission.bookingStatus ??
        "",

      name:
        fieldText(
          event,
          "name",
        ),

      email:
        fieldText(
          event,
          "email",
        ),

      phone:
        fieldText(
          event,
          "phone",
        ),

      company:
        fieldText(
          event,
          "company",
        ),

      subject:
        fieldText(
          event,
          "subject",
        ),

      message:
        fieldText(
          event,
          "message",
        ),
    };

  return template.replace(
    /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
    (
      original,
      key: string,
    ) =>
      Object.prototype.hasOwnProperty.call(
        values,
        key,
      )
        ? values[key] ?? ""
        : original,
  );
}

export async function sendAutomationAdminEmail(
  event: AutomationEvent,
  input: {
    subject: string;
    message: string;
  },
): Promise<StaarkMailResult> {
  const settings =
    await readAdminSiteSettings();

  const to =
    settings.email.notificationEmail?.trim() ||
    settings.contact.email?.trim();

  if (!to) {
    throw new Error(
      "No notification email is configured for this website.",
    );
  }

  const subject =
    renderVariables(
      input.subject,
      event,
    )
      .trim()
      .slice(
        0,
        200,
      );

  const message =
    renderVariables(
      input.message,
      event,
    )
      .trim()
      .slice(
        0,
        5000,
      );

  if (!subject) {
    throw new Error(
      "Automation email subject resolved to an empty value.",
    );
  }

  if (!message) {
    throw new Error(
      "Automation email message resolved to an empty value.",
    );
  }

  const customerName =
    fieldText(
      event,
      "name",
    );

  const customerEmail =
    fieldText(
      event,
      "email",
    );

  const customerPhone =
    fieldText(
      event,
      "phone",
    );

  const rendered =
    renderEmailTemplate({
      siteName:
        settings.name,

      eyebrow:
        "Staark Automation",

      title:
        subject,

      intro:
        message,

      rows: [
        {
          label:
            "Reference",
          value:
            event.submission.id,
        },
        {
          label:
            "Type",
          value:
            event.submission.kind,
        },
        ...(customerName
          ? [
              {
                label:
                  "Name",
                value:
                  customerName,
              },
            ]
          : []),
        ...(customerEmail
          ? [
              {
                label:
                  "Email",
                value:
                  customerEmail,
              },
            ]
          : []),
        ...(customerPhone
          ? [
              {
                label:
                  "Phone",
                value:
                  customerPhone,
              },
            ]
          : []),
      ],

      footer:
        `${settings.name} · Powered by Staark`,
    });

  const replyTo =
    customerEmail ||
    settings.email.replyTo?.trim() ||
    settings.contact.email?.trim() ||
    undefined;

  return sendMail({
    to,
    subject,
    text:
      rendered.text,
    html:
      rendered.html,

    fromName:
      settings.email.fromName?.trim() ||
      settings.name,

    ...(replyTo
      ? {
          replyTo,
        }
      : {}),
  });
}
