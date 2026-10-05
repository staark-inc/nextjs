import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  AdminPageConflictError,
  AdminPageNotFoundError,
  adminPagesUsePostgres,
  publishPostgresAdminPage,
} from "@/lib/admin-page-postgres";
import { requireAuth } from "../../../guard";

import {
  appendAdminAction,
} from "@/lib/admin-audit";

type Ctx = {
  params: Promise<{ file: string }>;
};

export async function POST(
  _req: Request,
  ctx: Ctx,
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  if (!adminPagesUsePostgres()) {
    return NextResponse.json(
      {
        error:
          "Explicit publishing is only available with PostgreSQL content.",
      },
      { status: 409 },
    );
  }

  const { file } = await ctx.params;

  try {
    const result =
      await publishPostgresAdminPage(file);

    revalidatePath("/", "layout");
    revalidatePath(result.publication.path);

    if (
      result.pathChanged &&
      result.previousPublishedPath
    ) {
      revalidatePath(
        result.previousPublishedPath,
      );
    }

    await appendAdminAction({
      area: "pages",
      action: "page.published",
      message: `Page "${file}" was published.`,
      resource: "page",
      resourceId: file,
      meta: {
        path:
          result.publication.path,
        redirectCreated:
          result.pathChanged,
      },
    });

    return NextResponse.json({
      ok: true,
      publication: result.publication,
      redirectCreated: result.pathChanged,
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
          error instanceof Error
            ? error.message
            : "Could not publish page.",
      },
      { status },
    );
  }
}
