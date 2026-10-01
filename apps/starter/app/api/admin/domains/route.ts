import { NextResponse } from "next/server";
import {
  checkAdminCustomDomainDns,
  createAdminCustomDomain,
  deleteAdminCustomDomain,
  domainErrorResponse,
  listAdminDomains,
} from "@/lib/admin-domains";
import { requireAuth } from "../guard";

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

    const verification = await checkAdminCustomDomainDns(body.id);
    const state = await listAdminDomains();

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

    await deleteAdminCustomDomain(body.id);
    const state = await listAdminDomains();
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
