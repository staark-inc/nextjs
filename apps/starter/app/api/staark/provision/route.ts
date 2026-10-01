import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import {
  provisionFromHub,
  type HubProvisioningInput,
} from "@/lib/hub-provisioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLOCK_SKEW_SECONDS = 300;

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");

    return aa.length > 0 &&
      aa.length === bb.length &&
      timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function verifyHubRequest(
  body: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): boolean {
  if (!timestamp || !signature) return false;

  const unix = Number(timestamp);
  if (!Number.isInteger(unix)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - unix) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return safeEqualHex(expected, signature);
}

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

  if (
    !verifyHubRequest(
      rawBody,
      request.headers.get("x-staark-timestamp"),
      request.headers.get("x-staark-signature"),
      secret,
    )
  ) {
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
