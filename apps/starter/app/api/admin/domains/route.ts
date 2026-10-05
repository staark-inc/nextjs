import { NextResponse } from "next/server";
import {
  checkAdminCustomDomainDns,
  createAdminCustomDomain,
  deleteAdminCustomDomain,
  domainErrorResponse,
  listAdminDomains,
} from "@/lib/admin-domains";
import { requireAuth } from "../guard";

import {
  appendAdminAction,
} from "@/lib/admin-audit";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  return NextResponse.json(await listAdminDomains());
}

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { hostname?: unknown };
    const domain = await createAdminCustomDomain(body);
    const state = await listAdminDomains();

    await appendAdminAction({
      area: "domains",
      action: "domain.created",
      message: `Custom domain ${domain.hostname} was added.`,
      resource: "domain",
      resourceId: domain.id,
      changedKeys: [
        "hostname",
      ],
      meta: {
        hostname:
          domain.hostname,
        type:
          domain.type,
      },
    });

    return NextResponse.json(
      { ok: true, domain, ...state },
      { status: 201 },
    );
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}


export async function PATCH(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { id?: unknown };
    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing domain id." },
        { status: 400 },
      );
    }

    const beforeState =
      await listAdminDomains();

    const target =
      beforeState.domains.find(
        (domain) =>
          domain.id ===
          body.id,
      );

    const verification = await checkAdminCustomDomainDns(body.id);
    const state = await listAdminDomains();

    await appendAdminAction({
      area: "domains",
      action: "domain.verification_checked",
      message: target
        ? `DNS verification checked for ${target.hostname}.`
        : "Domain DNS verification checked.",
      resource: "domain",
      resourceId: body.id,
      meta: {
        ...(target
          ? {
              hostname:
                target.hostname,
            }
          : {}),
        verified:
          verification.verified,
        connected:
          verification.connected,
        sslStatus:
          verification.sslStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      verification,
      ...state,
    });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { id?: unknown };
    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing domain id." },
        { status: 400 },
      );
    }

    const beforeState =
      await listAdminDomains();

    const target =
      beforeState.domains.find(
        (domain) =>
          domain.id ===
          body.id,
      );

    await deleteAdminCustomDomain(body.id);
    const state = await listAdminDomains();

    await appendAdminAction({
      area: "domains",
      action: "domain.deleted",
      message: target
        ? `Custom domain ${target.hostname} was removed.`
        : "Custom domain was removed.",
      resource: "domain",
      resourceId: body.id,
      meta: target
        ? {
            hostname:
              target.hostname,
          }
        : undefined,
    });

    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
