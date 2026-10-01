import { NextResponse } from "next/server";
import {
  MailConfigurationError,
  summarizeMailConfig,
} from "@staark/platform/server";
import { requireAuth } from "../../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const summary = summarizeMailConfig();

    return NextResponse.json(
      {
        configured: summary.configured,
        transport: summary.configured ? "smtp" : "disabled",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        {
          configured: false,
          transport: "disabled",
          error: "Email delivery is not available.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    console.error(
      "[staark] Could not resolve mail status:",
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json(
      { error: "Could not read email transport status." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
