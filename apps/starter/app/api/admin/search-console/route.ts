import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  requireAdminTenantContext,
} from "@/lib/admin-tenant";
import {
  requirePlanFeature,
} from "../guard";
import {
  bindSearchConsoleProperty,
  readSearchConsoleBinding,
  SearchConsoleBindingConflictError,
} from "@/lib/search-console-binding";
import {
  searchConsoleServiceSummary,
  testSearchConsoleProperty,
} from "@/lib/google-search-console-data";

import {
  normalizeSearchConsoleSiteUrl,
} from "@/lib/search-console-property";

export async function GET() {
  const blocked =
    await requirePlanFeature("searchConsole");

  if (blocked) return blocked;

  const tenant =
    await requireAdminTenantContext();

  return NextResponse.json({
    binding:
      await readSearchConsoleBinding(
        tenant.siteId,
      ),
    service:
      searchConsoleServiceSummary(),
  });
}

export async function PUT(
  request: Request,
) {
  const blocked =
    await requirePlanFeature("searchConsole");

  if (blocked) return blocked;

  const tenant =
    await requireAdminTenantContext();

  const raw =
    await request.json().catch(() => null);

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return NextResponse.json(
      { error: "Invalid Search Console configuration." },
      { status: 400 },
    );
  }

  const input =
    raw as Record<string, unknown>;

  const siteUrl =
    normalizeSearchConsoleSiteUrl(input.siteUrl);

  if (!siteUrl) {
    return NextResponse.json(
      {
        error:
          "Use a Search Console property such as sc-domain:example.com or https://example.com/.",
      },
      { status: 422 },
    );
  }

  try {
    const test =
      await testSearchConsoleProperty(
        siteUrl,
      );

    const binding =
      await bindSearchConsoleProperty({
        siteId: tenant.siteId,
        siteUrl,
        enabled: input.enabled !== false,
      });

    revalidatePath("/admin/search-console");

    return NextResponse.json({
      ok: true,
      binding,
      permissionLevel:
        test.permissionLevel,
    });
  } catch (error) {
    const status =
      error instanceof SearchConsoleBindingConflictError
        ? 409
        : 400;

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not connect Search Console.",
      },
      { status },
    );
  }
}
