import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import {
  IMAGE_EXTENSION,
  UPLOAD_IMAGE_EXTENSION,
  deleteMediaFile,
  describeMediaFile,
  listMediaFiles,
  mediaExists,
  readMediaMetadata,
  safeMediaName,
  uniqueMediaName,
  writeMediaFile,
  writeMediaMetadata,
} from "@/lib/admin-media";
import { buildMediaUsageIndex, findMediaUsage } from "@/lib/admin-media-usage";
import {
  readAdminSiteQuota,
} from "@/lib/site-quota";
import { requireAuth } from "../guard";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const [described, usageIndex, quota] = await Promise.all([
      listMediaFiles(),
      buildMediaUsageIndex(),
      readAdminSiteQuota("storage"),
    ]);
    const files = described.map((file) => {
      const usage = usageIndex[file.name] ?? [];
      return { ...file, usage, usageCount: usage.length };
    });
    return NextResponse.json({
      files,
      quota,
    });
  } catch {
    return NextResponse.json({
      files: [],
      quota: null,
    });
  }
}

export async function POST(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const replace = formData.get("replace") === "true";
  const targetName = typeof formData.get("targetName") === "string" ? String(formData.get("targetName")) : "";

  if (!files.length) return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  if (replace && (files.length !== 1 || !targetName)) {
    return NextResponse.json({ error: "Replacing media requires one file and a target name." }, { status: 400 });
  }

  const metadata = await readMediaMetadata();
  const uploaded = [];

  const storageQuota =
    await readAdminSiteQuota(
      "storage",
    );

  let projectedStorage =
    storageQuota?.current ?? 0;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is larger than 10 MB.` }, { status: 413 });
    }

    const requested = safeMediaName(file.name);
    if (!requested || !IMAGE_EXTENSION.test(requested)) {
      return NextResponse.json({ error: `${file.name} is not a supported image file.` }, { status: 415 });
    }
    if (!UPLOAD_IMAGE_EXTENSION.test(requested)) {
      return NextResponse.json(
        { error: "SVG uploads are disabled for security. Use JPEG, PNG, WebP, AVIF, GIF or ICO." },
        { status: 415 },
      );
    }

    let name: string;
    let replacedBytes = 0;

    if (replace) {
      name = safeMediaName(targetName);

      if (
        !IMAGE_EXTENSION.test(name) ||
        !(await mediaExists(name))
      ) {
        return NextResponse.json(
          {
            error:
              "The image being replaced no longer exists.",
          },
          {
            status:
              404,
          },
        );
      }

      if (
        path.extname(name).toLowerCase() !==
        path.extname(requested).toLowerCase()
      ) {
        return NextResponse.json(
          {
            error:
              "Replacement image must use the same file extension to preserve its public URL.",
          },
          {
            status:
              400,
          },
        );
      }

      const existing =
        await describeMediaFile(
          name,
          metadata,
        );

      replacedBytes =
        existing?.size ?? 0;
    } else {
      name =
        await uniqueMediaName(
          requested,
        );
    }

    if (storageQuota) {
      const additionalBytes =
        Math.max(
          0,
          file.size -
            replacedBytes,
        );

      projectedStorage =
        projectedStorage +
        additionalBytes;

      if (
        storageQuota.limit !== null &&
        projectedStorage >
          storageQuota.limit
      ) {
        return NextResponse.json(
          {
            error:
              "Your storage limit has been reached. Delete unused media or upgrade your plan.",
            code:
              "PLAN_LIMIT_REACHED",
            limitKey:
              "storageBytes",
            limit:
              storageQuota.limit,
            current:
              projectedStorage -
              file.size,
            incoming:
              file.size,
          },
          {
            status:
              403,
          },
        );
      }
    }

    await writeMediaFile(
      name,
      new Uint8Array(
        await file.arrayBuffer(),
      ),
    );
    const described = await describeMediaFile(name, metadata);
    if (described) uploaded.push(described);
  }

  return NextResponse.json({ uploaded });
}

export async function PUT(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = (await req.json()) as { name?: string; alt?: string };
  const name = safeMediaName(body.name ?? "");
  if (!name || !(await mediaExists(name))) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (typeof body.alt !== "string" || body.alt.length > 300) {
    return NextResponse.json({ error: "Alt text must be 300 characters or fewer." }, { status: 400 });
  }

  const metadata = await readMediaMetadata();
  const alt = body.alt.trim();
  if (alt) metadata[name] = { ...metadata[name], alt };
  else delete metadata[name];
  await writeMediaMetadata(metadata);

  return NextResponse.json({ ok: true, name, alt });
}

export async function DELETE(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { name: requestedName } = (await req.json()) as { name?: string };
  if (!requestedName) return NextResponse.json({ error: "Missing file name." }, { status: 400 });

  const name = safeMediaName(requestedName);
  if (!name || name !== requestedName) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
  }

  if (!(await mediaExists(name))) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const usage = await findMediaUsage(name);
  if (usage.length) {
    return NextResponse.json(
      {
        error: `${name} is used in ${usage.length} place${usage.length === 1 ? "" : "s"}. Remove those references or replace the image instead.`,
        inUse: true,
        usage,
      },
      { status: 409 },
    );
  }

  await deleteMediaFile(name);
  const metadata = await readMediaMetadata();
  if (metadata[name]) {
    delete metadata[name];
    await writeMediaMetadata(metadata);
  }
  return NextResponse.json({ ok: true });
}
