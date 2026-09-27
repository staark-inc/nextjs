import { NextResponse } from "next/server";
import { runSiteHealth } from "@/lib/admin-site-health";
import { requireAuth } from "../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    return NextResponse.json(await runSiteHealth());
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message || "Site health scan failed.",
      },
      { status: 500 },
    );
  }
}
