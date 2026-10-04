import {
  NextResponse,
} from "next/server";

import {
  requirePlanFeature,
} from "../../guard";

import {
  readAdminSeoOpportunities,
} from "@/lib/admin-seo-opportunities";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const blocked =
    await requirePlanFeature(
      "seo",
    );

  if (blocked) {
    return blocked;
  }

  try {
    return NextResponse.json(
      await readAdminSeoOpportunities(),
      {
        headers: {
          "cache-control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "SEO opportunities could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
