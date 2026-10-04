import { NextResponse } from "next/server";
import { createAdminBillingPortalSession } from "@/lib/admin-billing";
import { requireAuth } from "../../guard";

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const forwardedHost =
      (
        req.headers.get("x-forwarded-host") ??
        req.headers.get("host")
      )
        ?.split(",")[0]
        ?.trim();

    if (!forwardedHost) {
      throw new Error("Could not determine public host.");
    }

    const forwardedProto =
      req.headers
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim()
        .toLowerCase();

    const protocol =
      process.env.NODE_ENV === "production"
        ? "https"
        : forwardedProto === "https" || forwardedProto === "http"
          ? forwardedProto
          : "http";

    const origin = `${protocol}://${forwardedHost}`;

    const session = await createAdminBillingPortalSession(
      `${origin}/admin/plan`,
    );

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    console.error("[billing/portal]", error);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not open billing management.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}