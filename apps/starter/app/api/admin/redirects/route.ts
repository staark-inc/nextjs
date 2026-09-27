import { NextResponse } from "next/server";
import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "@/lib/admin-redirects";
import { requireAuth } from "../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  return NextResponse.json(await listRedirects());
}

export async function POST(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const redirect = await createRedirect(body);
    const state = await listRedirects();
    return NextResponse.json({ ok: true, redirect, ...state }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not create redirect." },
      { status: 422 },
    );
  }
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Missing redirect id." }, { status: 400 });
    }

    const redirect = await updateRedirect(body.id, body);
    const state = await listRedirects();
    return NextResponse.json({ ok: true, redirect, ...state });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not update redirect." },
      { status: 422 },
    );
  }
}

export async function DELETE(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Missing redirect id." }, { status: 400 });
    }

    await deleteRedirect(body.id);
    const state = await listRedirects();
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not delete redirect." },
      { status: 422 },
    );
  }
}
