import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const MAX_BODY_BYTES = 2048;
const MAX_SKEW_SECONDS = 300;

function authorized(raw: string, request: Request, secret: string): boolean {
  const timestamp = request.headers.get("x-staark-timestamp");
  const signature = request.headers.get("x-staark-signature");
  if (!timestamp || !signature || !/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > MAX_SKEW_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`POST\n/api/staark/inventory\n${timestamp}.${raw}`).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Internal signed read-only inventory. Stable cursor ordering is by immutable Site.id.
 * Consumers must paginate until nextCursor is null. No writes or public access.
 */
export async function POST(request: Request) {
  const secret = process.env.STAARK_PROVISIONING_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "Inventory is unavailable." }, { status: 503 });

  // Reject oversized bodies while streaming: request.text() would buffer the entire payload.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!authorized(raw, request, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let input: unknown;
  try { input = JSON.parse(raw); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const { cursor = null, limit = 50 } = input as { cursor?: unknown; limit?: unknown };
  if ((cursor !== null && !isUuid(cursor)) || !Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_LIMIT) {
    return NextResponse.json({ ok: false, error: "Invalid cursor or limit." }, { status: 400 });
  }
  const pageSize = limit as number;

  try {
    const prisma = getPrismaClient();
    const sites = await prisma.site.findMany({
      ...(cursor ? { where: { id: { gt: cursor } } } : {}),
      orderBy: { id: "asc" },
      take: pageSize + 1,
      select: {
        id: true,
        key: true,
        organizationId: true,
        setupCompletedAt: true,
        domains: {
          select: { hostname: true, primaryDomain: true, verified: true },
          orderBy: [{ primaryDomain: "desc" }, { hostname: "asc" }],
        },
      },
    });
    const hasMore = sites.length > pageSize;
    const page = sites.slice(0, pageSize);
    return NextResponse.json({
      ok: true,
      sites: page.map((site) => ({
        id: site.id,
        key: site.key,
        organizationId: site.organizationId,
        setupCompleted: site.setupCompletedAt !== null,
        domains: site.domains,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Inventory query failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
