import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_TTL_SECONDS } from "@staark/platform/server";

import { getSession } from "@/lib/auth";
import {
  createFirstSetup,
  isFirstSetupRequired,
  type FirstSetupInput,
} from "@/lib/first-setup";
import {
  SETUP_CLAIM_COOKIE,
  validateSetupSession,
} from "@/lib/setup-claim";
import { notifyHubSetupActivated } from "@/lib/hub-activation";

export const dynamic = "force-dynamic";

function tenantRequest(request: NextRequest) {
  return {
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  };
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = (
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      ""
    )
      .split(",")[0]
      ?.trim()
      .toLowerCase() ?? "";
    return Boolean(requestHost) && originHost === requestHost;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Invalid origin." },
      { status: 403 },
    );
  }

  const inputTenant = tenantRequest(request);
  const claim = await validateSetupSession(
    inputTenant,
    request.cookies.get(SETUP_CLAIM_COOKIE)?.value,
  );

  if (!claim) {
    return NextResponse.json(
      { ok: false, error: "Setup claim is invalid or expired." },
      { status: 403 },
    );
  }

  if (!(await isFirstSetupRequired(inputTenant))) {
    return NextResponse.json(
      { ok: false, error: "First configuration has already been completed." },
      { status: 409 },
    );
  }

  try {
    const input = (await request.json()) as FirstSetupInput;
    const result = await createFirstSetup(input, inputTenant);

    if (!result.ownerUserId || !result.ownerEmail) {
      throw new Error("Owner account was not created.");
    }

    const session = await getSession();
    const loginAt = Date.now();
    session.isLoggedIn = true;
    session.username = result.ownerEmail;
    session.role = "client";
    session.loginAt = loginAt;
    session.expiresAt = loginAt + ADMIN_SESSION_TTL_SECONDS * 1000;
    session.remember = false;
    await session.save();

    // Best-effort: customer setup must not fail if Hub is temporarily
    // unavailable. Re-provisioning can reconcile ACTIVE state later.
    await notifyHubSetupActivated({
      siteId: result.siteId,
      siteKey: result.siteKey,
      ownerEmail: result.ownerEmail,
    });

    const response = NextResponse.json({ ok: true, ...result });
    response.cookies.set(SETUP_CLAIM_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "First configuration failed.",
      },
      { status: 400 },
    );
  }
}
