import { NextResponse } from "next/server";
import {
  MailConfigurationError,
  sendMail,
  verifyMailTransport,
} from "@staark/platform/server";
import { requireManager } from "../../guard";

function validEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const blocked = await requireManager();
  if (blocked) return blocked;

  let body: { to?: unknown; verifyOnly?: unknown };
  try {
    body = (await req.json()) as { to?: unknown; verifyOnly?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  try {
    if (body.verifyOnly === true) {
      await verifyMailTransport();
      return NextResponse.json({ ok: true, verified: true });
    }

    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!validEmail(to)) {
      return NextResponse.json(
        { error: "A valid recipient email is required." },
        { status: 400 },
      );
    }

    const result = await sendMail({
      to,
      subject: "Staark SMTP test",
      text: [
        "Staark Next SMTP transport is working.",
        "",
        `Sent at: ${new Date().toISOString()}`,
        "This is a manager-triggered diagnostic message.",
      ].join("\n"),
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error(
      "[staark] SMTP diagnostic failed:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "SMTP diagnostic failed. Check server logs and mail configuration." },
      { status: 502 },
    );
  }
}
