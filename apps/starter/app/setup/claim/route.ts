import { NextRequest, NextResponse } from "next/server";

import {
  exchangeSetupClaim,
  SETUP_CLAIM_COOKIE,
  SETUP_SESSION_TTL_MS,
} from "@/lib/setup-claim";

export const dynamic = "force-dynamic";

function publicOrigin(request: NextRequest): string {
  const forwardedHost =
    request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();

  const host =
    forwardedHost ||
    request.headers
      .get("host")
      ?.split(",")[0]
      ?.trim();

  const forwardedProto =
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : "https";

  if (!host) {
    throw new Error("Unable to resolve public request host.");
  }

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  const claim = await exchangeSetupClaim(
    {
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
    },
    token,
  );

  if (!claim) {
    return new NextResponse("Not found", { status: 404 });
  }

  const response = NextResponse.redirect(
    new URL("/setup", publicOrigin(request)),
  );

  response.cookies.set(SETUP_CLAIM_COOKIE, claim.token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SETUP_SESSION_TTL_MS / 1000),
  });

  return response;
}
