import { NextResponse } from "next/server";
import { readAdminBillingStatus } from "@/lib/admin-billing";
import { requireAuth } from "../../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  return NextResponse.json(await readAdminBillingStatus());
}
