import { NextResponse } from "next/server";
import { resolveAdminRole } from "@staark/platform/server";

import { getSession, isSessionActive } from "@/lib/auth";
import {
  createFirstSetup,
  isFirstSetupRequired,
  resolveFirstSetupState,
  type FirstSetupInput,
} from "@/lib/first-setup";

export const dynamic = "force-dynamic";

function tenantRequest(request: Request) {
  return {
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  };
}

export async function GET(request: Request) {
  const session = await getSession();

  if (
    !isSessionActive(session) ||
    resolveAdminRole(session.role) !== "manager"
  ) {
    return NextResponse.json(
      { ok: false, error: "Not authorized." },
      { status: 403 },
    );
  }

  const setup = await resolveFirstSetupState(tenantRequest(request));

  return NextResponse.json({
    ok: true,
    ...setup,
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (
    !isSessionActive(session) ||
    resolveAdminRole(session.role) !== "manager"
  ) {
    return NextResponse.json(
      { ok: false, error: "Not authorized." },
      { status: 403 },
    );
  }

  const requestTenant = tenantRequest(request);

  if (!(await isFirstSetupRequired(requestTenant))) {
    return NextResponse.json(
      {
        ok: false,
        error: "First configuration has already been completed.",
      },
      { status: 409 },
    );
  }

  try {
    const input = (await request.json()) as FirstSetupInput;
    const result = await createFirstSetup(input, requestTenant);

    return NextResponse.json({
      ok: true,
      ...result,
    });
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
