import { NextResponse } from "next/server";

import {
  provisionFromHub,
  type HubProvisioningInput,
} from "@/lib/hub-provisioning";

import {
  verifyHubControlRequest,
} from "@/lib/control-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STAARK_PROVISIONING_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "STAARK_PROVISIONING_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  const verified =
    verifyHubControlRequest(
      request,
      rawBody,
      secret,
    );

  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Invalid provisioning signature." },
      { status: 401 },
    );
  }

  try {
    const payload = JSON.parse(rawBody) as HubProvisioningInput;
    const result = await provisionFromHub(payload);

    return NextResponse.json({
      ok: true,
      ...result,
      setupExpiresAt:
        result.setupExpiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Provisioning failed.";

    console.error("[STAARK] Hub provisioning failed:", error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
