import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import {
  IMAGE_EXTENSION,
  UPLOAD_IMAGE_EXTENSION,
  deleteMediaFile,
  describeMediaFile,
  listMediaFiles,
  mediaExists,
  readMediaFile,
  readMediaMetadata,
  safeMediaName,
  uniqueMediaName,
  writeMediaFile,
  writeMediaMetadata,
} from "@/lib/admin-media";
import { buildMediaUsageIndex, findMediaUsage } from "@/lib/admin-media-usage";
import {
  readAdminSiteQuota,
  siteQuotaLimit,
} from "@/lib/site-quota";
import { requireAuth } from "../guard";
import { resolveAdminMediaSiteId } from "@/lib/admin-media-scope";
import { resolvePublicContentConfig } from "@/lib/content-source";
import { requireAdminTenantContext } from "@/lib/admin-tenant";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  imageBytesMatchExtension,
  MAX_MEDIA_MULTIPART_BYTES,
  validateMediaUploadBatch,
} from "@/lib/media-upload-policy";

class UploadQuotaError extends Error {
  readonly limit: number;
  readonly current: number;
  readonly incoming: number;

  constructor(
    limit: number,
    current: number,
    incoming: number,
  ) {
    super("Storage quota exceeded.");
    this.name = "UploadQuotaError";
    this.limit = limit;
    this.current = current;
    this.incoming = incoming;
  }
}

function reserveMediaName(
  requested: string,
  used: Set<string>,
): string {
  if (!used.has(requested)) {
    used.add(requested);
    return requested;
  }

  const ext =
    path.extname(requested);

  const stem =
    path.basename(
      requested,
      ext,
    );

  let index = 2;

  while (
    used.has(
      `${stem}-${index}${ext}`,
    )
  ) {
    index += 1;
  }

  const name =
    `${stem}-${index}${ext}`;

  used.add(name);
  return name;
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const siteId =
      await resolveAdminMediaSiteId();

    const [described, usageIndex, quota] = await Promise.all([
      listMediaFiles(siteId),
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
  const blocked =
    await requireAuth();

  if (blocked) return blocked;

  const contentLength =
    Number(
      req.headers.get(
        "content-length",
      ) ?? "0",
    );

  if (
    Number.isFinite(
      contentLength,
    ) &&
    contentLength >
      MAX_MEDIA_MULTIPART_BYTES
  ) {
    return NextResponse.json(
      {
        error:
          "The upload request is too large.",
        code:
          "UPLOAD_REQUEST_TOO_LARGE",
      },
      {
        status: 413,
      },
    );
  }

  const siteId =
    await resolveAdminMediaSiteId();

  let formData: FormData;

  try {
    formData =
      await req.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "The upload request could not be read.",
      },
      {
        status: 400,
      },
    );
  }

  const files =
    formData
      .getAll("files")
      .filter(
        (value):
          value is File =>
          value instanceof File,
      );

  const replace =
    formData.get(
      "replace",
    ) === "true";

  const rawTargetName =
    formData.get(
      "targetName",
    );

  const targetName =
    typeof rawTargetName ===
      "string"
      ? rawTargetName
      : "";

  const shape =
    validateMediaUploadBatch(
      files.map(
        (file) => ({
          name:
            file.name,
          size:
            file.size,
        }),
      ),
    );

  if (!shape.ok) {
    return NextResponse.json(
      {
        error:
          shape.error,
        code:
          shape.code,
      },
      {
        status:
          shape.status,
      },
    );
  }

  if (
    replace &&
    (
      files.length !== 1 ||
      !targetName
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Replacing media requires one file and a target name.",
      },
      {
        status: 400,
      },
    );
  }

  const prepared: Array<{
    originalName: string;
    requested: string;
    bytes: Uint8Array;
  }> = [];

  /*
   * Decode and validate every file before writing anything.
   * A malformed final file can therefore never leave earlier files behind.
   */
  for (const file of files) {
    const requested =
      safeMediaName(
        file.name,
      );

    if (
      !requested ||
      !UPLOAD_IMAGE_EXTENSION.test(
        requested,
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${file.name} is not a supported raster image.`,
        },
        {
          status: 415,
        },
      );
    }

    const bytes =
      new Uint8Array(
        await file.arrayBuffer(),
      );

    if (
      !imageBytesMatchExtension(
        requested,
        bytes,
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${file.name} does not contain a valid ${path.extname(requested).slice(1).toUpperCase()} image.`,
          code:
            "INVALID_IMAGE_CONTENT",
        },
        {
          status: 415,
        },
      );
    }

    prepared.push({
      originalName:
        file.name,
      requested,
      bytes,
    });
  }

  const postgres =
    resolvePublicContentConfig()
      .source === "postgres";

  const tenant =
    postgres
      ? await requireAdminTenantContext()
      : null;

  if (
    postgres &&
    (
      !siteId ||
      !tenant ||
      tenant.siteId !== siteId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Tenant media scope could not be verified.",
      },
      {
        status: 403,
      },
    );
  }

  const storageLimit =
    tenant
      ? siteQuotaLimit(
          tenant.entitlements,
          "storage",
        )
      : null;

  type AppliedWrite = {
    name: string;
    previous: Uint8Array | null;
  };

  const applied:
    AppliedWrite[] = [];

  async function rollbackWrites() {
    for (
      const operation of
        [...applied].reverse()
    ) {
      try {
        if (
          operation.previous
        ) {
          await writeMediaFile(
            siteId,
            operation.name,
            operation.previous,
          );
        } else {
          await deleteMediaFile(
            siteId,
            operation.name,
          );
        }
      } catch (error) {
        console.error(
          "[media] Upload rollback failed:",
          operation.name,
          error,
        );
      }
    }
  }

  async function performUpload(
    tx:
      | Awaited<
          ReturnType<
            typeof getPrismaClient
          >
        >
      | any = null,
  ) {
    const [
      existingFiles,
      metadata,
    ] =
      await Promise.all([
        listMediaFiles(
          siteId,
        ),
        readMediaMetadata(
          siteId,
        ),
      ]);

    const existingByName =
      new Map(
        existingFiles.map(
          (file) => [
            file.name,
            file,
          ],
        ),
      );

    const usedNames =
      new Set(
        existingFiles.map(
          (file) =>
            file.name,
        ),
      );

    const currentBytes =
      existingFiles.reduce(
        (total, file) =>
          total +
          Math.max(
            0,
            file.size,
          ),
        0,
      );

    const plan: Array<{
      name: string;
      bytes: Uint8Array;
      previous: Uint8Array | null;
      previousSize: number;
    }> = [];

    for (
      const item of prepared
    ) {
      let name: string;
      let previous:
        Uint8Array | null =
        null;
      let previousSize = 0;

      if (replace) {
        name =
          safeMediaName(
            targetName,
          );

        const existing =
          existingByName.get(
            name,
          );

        if (
          !name ||
          !IMAGE_EXTENSION.test(
            name,
          ) ||
          !existing
        ) {
          throw new Error(
            "The image being replaced no longer exists.",
          );
        }

        if (
          path
            .extname(name)
            .toLowerCase() !==
          path
            .extname(
              item.requested,
            )
            .toLowerCase()
        ) {
          throw new Error(
            "Replacement image must use the same file extension to preserve its public URL.",
          );
        }

        previous =
          await readMediaFile(
            siteId,
            name,
          );

        if (!previous) {
          throw new Error(
            "The image being replaced could not be read.",
          );
        }

        previousSize =
          existing.size;
      } else {
        name =
          reserveMediaName(
            item.requested,
            usedNames,
          );
      }

      plan.push({
        name,
        bytes:
          item.bytes,
        previous,
        previousSize,
      });
    }

    const delta =
      plan.reduce(
        (total, item) =>
          total +
          item.bytes.byteLength -
          item.previousSize,
        0,
      );

    const nextBytes =
      Math.max(
        0,
        currentBytes +
          delta,
      );

    if (
      storageLimit !== null &&
      nextBytes >
        storageLimit
    ) {
      throw new UploadQuotaError(
        storageLimit,
        currentBytes,
        Math.max(
          0,
          delta,
        ),
      );
    }

    for (
      const item of plan
    ) {
      /*
       * Record the rollback operation BEFORE the write, because a storage
       * backend may fail after a partial write.
       */
      applied.push({
        name:
          item.name,
        previous:
          item.previous,
      });

      await writeMediaFile(
        siteId,
        item.name,
        item.bytes,
      );
    }

    const uploaded = [];

    for (
      const item of plan
    ) {
      const described =
        await describeMediaFile(
          siteId,
          item.name,
          metadata,
        );

      if (described) {
        uploaded.push(
          described,
        );
      }
    }

    if (
      tx &&
      siteId
    ) {
      const nextCount =
        existingFiles.length +
        (
          replace
            ? 0
            : plan.length
        );

      await tx.siteUsage.upsert({
        where: {
          siteId,
        },

        create: {
          siteId,
          storageBytes:
            BigInt(
              nextBytes,
            ),
          mediaCount:
            nextCount,
        },

        update: {
          storageBytes:
            BigInt(
              nextBytes,
            ),
          mediaCount:
            nextCount,
        },
      });
    }

    return uploaded;
  }

  try {
    let uploaded;

    if (
      postgres &&
      siteId
    ) {
      const prisma =
        getPrismaClient();

      uploaded =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Cross-process lock. Every runtime instance serializes storage
             * quota decisions for this exact tenant.
             */
            await tx.$executeRaw`
              SELECT pg_advisory_xact_lock(
                hashtext(${`media:${siteId}`})
              )
            `;

            return performUpload(
              tx,
            );
          },
          {
            maxWait: 5000,
            timeout: 30000,
          },
        );
    } else {
      uploaded =
        await performUpload();
    }

    return NextResponse.json({
      uploaded,
    });
  } catch (error) {
    if (applied.length) {
      await rollbackWrites();
    }

    if (
      error instanceof
        UploadQuotaError
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
            error.limit,
          current:
            error.current,
          incoming:
            error.incoming,
        },
        {
          status: 403,
        },
      );
    }

    console.error(
      "[media] Upload failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const siteId =
    await resolveAdminMediaSiteId();

  const body = (await req.json()) as { name?: string; alt?: string };
  const name = safeMediaName(body.name ?? "");
  if (!name || !(await mediaExists(siteId, name))) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (typeof body.alt !== "string" || body.alt.length > 300) {
    return NextResponse.json({ error: "Alt text must be 300 characters or fewer." }, { status: 400 });
  }

  const metadata = await readMediaMetadata(siteId);
  const alt = body.alt.trim();
  if (alt) metadata[name] = { ...metadata[name], alt };
  else delete metadata[name];
  await writeMediaMetadata(siteId, metadata);

  return NextResponse.json({ ok: true, name, alt });
}

export async function DELETE(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const siteId =
    await resolveAdminMediaSiteId();

  const { name: requestedName } = (await req.json()) as { name?: string };
  if (!requestedName) return NextResponse.json({ error: "Missing file name." }, { status: 400 });

  const name = safeMediaName(requestedName);
  if (!name || name !== requestedName) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
  }

  if (!(await mediaExists(siteId, name))) {
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

  await deleteMediaFile(siteId, name);
  const metadata = await readMediaMetadata(siteId);
  if (metadata[name]) {
    delete metadata[name];
    await writeMediaMetadata(siteId, metadata);
  }
  return NextResponse.json({ ok: true });
}
