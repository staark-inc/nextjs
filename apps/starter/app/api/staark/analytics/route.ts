import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Analytics is intentionally disabled platform-wide.
 *
 * Keep this endpoint as a no-op during the transition so stale browser
 * bundles or cached pages cannot generate errors or analytics writes.
 */
export async function POST() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}
