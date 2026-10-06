import {
  NextResponse,
} from "next/server";

import {
  loadActiveCustomProject,
} from "@/lib/custom-project";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const project =
      await loadActiveCustomProject();

    return NextResponse.json({
      ok:
        true,

      runtime:
        "custom",

      schema:
        project.schema,

      project: {
        key:
          project.project.key,

        name:
          project.project.name,

        version:
          project.project.version,
      },

      theme:
        project.runtime
          .config.theme.family,

      capabilities:
        project.runtime
          .capabilities,

      unknownAddons:
        project.runtime
          .unknownAddons,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,

        runtime:
          "custom",

        error:
          error instanceof Error
            ? error.message
            : "Custom runtime failed to load.",
      },

      {
        status:
          503,
      },
    );
  }
}
