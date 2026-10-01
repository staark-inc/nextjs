import { NextResponse } from "next/server";
import {
  MailConfigurationError,
  sendMail,
} from "@staark/platform/server";

import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import { requireAuth } from "../../guard";

function validEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const settings = await readAdminSiteSettings();
    const to =
      settings.email.notificationEmail?.trim() ||
      settings.contact.email?.trim() ||
      "";

    if (!validEmail(to)) {
      return NextResponse.json(
        {
          error:
            "Set a valid notification email in Settings before sending a test.",
        },
        { status: 400 },
      );
    }

    const replyTo =
      settings.email.replyTo?.trim() ||
      settings.contact.email?.trim() ||
      undefined;

    const result = await sendMail({
      to,
      subject: `Email test - ${settings.name}`,
      text: [
        `Email delivery for ${settings.name} is working.`,
        "",
        `Sent at: ${new Date().toISOString()}`,
        "Staark manages the email transport for this website.",
      ].join("\n"),
      fromName: settings.email.fromName?.trim() || settings.name,
      ...(replyTo ? { replyTo } : {}),
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      deliveredTo: to,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        { error: "Email delivery is not available." },
        { status: 503 },
      );
    }

    console.error(
      "[staark] SMTP test failed:",
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json(
      { error: "Could not send the test email. Check the server logs." },
      { status: 502 },
    );
  }
}
