import { NextRequest, NextResponse } from "next/server";
import {
  resolveDeploymentIdentity,
  verifySignature,
} from "@staark/platform/server";

const DEPLOYMENT_PATH = "/api/staark/deployment";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const siteId = process.env.STAARK_SITE_ID?.trim();
  const secret = process.env.STAARK_SITE_SECRET?.trim();

  // Never expose a remotely trusted identity endpoint using development
  // fallback secrets. A deployment must be paired before the Hub can query it.
  if (!siteId || !secret) {
    return NextResponse.json(
      { ok: false, error: "Deployment is not paired with Staark Hub." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const verified = verifySignature({
    method: "GET",
    path: DEPLOYMENT_PATH,
    body: "",
    headers: req.headers,
    siteId,
    secret,
  });

  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid deployment signature." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const deployment = await resolveDeploymentIdentity();
  return NextResponse.json(
    { ok: true, deployment },
    { headers: { "Cache-Control": "no-store" } },
  );
}
