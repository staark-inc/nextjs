import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  AdminPageConflictError,
  AdminPageNotFoundError,
  adminPagesUsePostgres,
  restorePostgresAdminPage,
} from "@/lib/admin-page-postgres";

import { requireAuth } from "../../../guard";

type Ctx = {
  params: Promise<{ file: string }>;
};

export async function POST(_req: Request, ctx: Ctx) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  if (!adminPagesUsePostgres()) {
    return NextResponse.json(
      {
        error:
          "Deleted page restore is only available in PostgreSQL mode.",
      },
      { status: 400 },
    );
  }

  try {
    const { file } = await ctx.params;

    const restored =
      await restorePostgresAdminPage(file);

    if (!restored) {
      return NextResponse.json(
        { error: "Deleted page not found." },
        { status: 404 },
      );
    }

    revalidatePath("/", "layout");
    revalidatePath(restored.page.path);

    return NextResponse.json({
      ok: true,
      page: restored.page,
    });
  } catch (error) {
    const status =
      error instanceof AdminPageNotFoundError
        ? 404
        : error instanceof AdminPageConflictError
          ? 409
          : 500;

    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "Could not restore deleted page.",
      },
      { status },
    );
  }
}
