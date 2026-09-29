import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  readSalonServices,
  writeSalonServices,
  type SalonServicesDocument,
} from "@/lib/admin-salon-services";
import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import { supportsServicesCatalog } from "@/lib/website-profile";
import { requireAuth } from "../guard";
import { appendAdminLog } from "@/lib/admin-logs";

export const runtime = "nodejs";

async function assertServicesCatalog():
Promise<NextResponse | null> {
  try {
    const site =
      await readAdminSiteSettings();

    if (
      !supportsServicesCatalog(
        site.websiteType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Services & prices is not available for this website type.",
        },
        { status: 404 },
      );
    }

    return null;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "Could not resolve website type.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const wrongProfile =
    await assertServicesCatalog();

  if (wrongProfile) {
    return wrongProfile;
  }

  try {
    return NextResponse.json(
      await readSalonServices(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const wrongProfile =
    await assertServicesCatalog();

  if (wrongProfile) {
    return wrongProfile;
  }

  let body: SalonServicesDocument;

  try {
    body =
      (await req.json()) as SalonServicesDocument;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  if (
    !body ||
    !Array.isArray(body.groups)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid services document.",
      },
      { status: 400 },
    );
  }

  try {
    const saved =
      await writeSalonServices(body);

    revalidatePath(saved.pagePath || "/");
    revalidatePath("/", "layout");

    await appendAdminLog({
      area: "salon",
      action: "services.updated",
      message:
        "Salon services and prices were updated.",
      meta: {
        groups: saved.groups.length,
        services:
          saved.groups.reduce(
            (total, group) =>
              total +
              group.items.length,
            0,
          ),
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message,
      },
      { status: 500 },
    );
  }
}
