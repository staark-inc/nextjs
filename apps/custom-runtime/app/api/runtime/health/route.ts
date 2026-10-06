import { resolveCustomServices } from "@/lib/custom-services";
import { resolveCustomTheme } from "@/lib/custom-theme";
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

    const services = resolveCustomServices(project);
    resolveCustomTheme(project, services.extensions.sections);
    return NextResponse.json({
      modules: services.extensions.definitions.filter(item => item.kind === "module").map(item => item.key),
      addons: services.extensions.definitions.filter(item => item.kind === "addon").map(item => item.key),
      integrations: Array.from(services.integrations.keys()),
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

    });
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,

        runtime:
          "custom",

        error:
          "Custom runtime failed to load.",
      },

      {
        status:
          503,
      },
    );
  }
}
