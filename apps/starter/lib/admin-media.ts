import {
  readdir,
  readFile,
  stat,
} from "node:fs/promises";

import path from "node:path";

import {
  getStorage,
  readStorageJson,
  writeStorageJson,
} from "@staark/platform/server";

import {
  stateStoragePath,
  tenantStateStoragePath,
  tenantUploadsStoragePath,
  uploadsStoragePath,
} from "./storage";

export const IMAGE_EXTENSION =
  /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i;

/**
 * Existing SVG assets stay readable, but new uploads are raster-only.
 */
export const UPLOAD_IMAGE_EXTENSION =
  /\.(jpg|jpeg|png|gif|webp|avif|ico)$/i;

const LEGACY_MEDIA_SEED_MARKER =
  "media-seeded-v1";

export type MediaMetadata =
  Record<
    string,
    {
      alt?: string;
    }
  >;

export type MediaFile = {
  name: string;
  url: string;
  size: number;
  modifiedAt: string;
  alt: string;
};

let legacySeedPromise:
  Promise<void> | undefined;

function uploadKey(
  siteId: string | null,
  ...parts: string[]
): string {
  return siteId
    ? tenantUploadsStoragePath(
        siteId,
        ...parts,
      )
    : uploadsStoragePath(
        ...parts,
      );
}

function stateKey(
  siteId: string | null,
  ...parts: string[]
): string {
  return siteId
    ? tenantStateStoragePath(
        siteId,
        ...parts,
      )
    : stateStoragePath(
        ...parts,
      );
}

function packagedUploadsCandidates():
string[] {
  const cwd =
    process.cwd();

  return [
    path.resolve(
      cwd,
      "public",
      "uploads",
    ),

    path.resolve(
      cwd,
      "apps",
      "starter",
      "public",
      "uploads",
    ),
  ];
}

async function packagedUploadsDir():
Promise<string | null> {
  for (
    const candidate
    of packagedUploadsCandidates()
  ) {
    try {
      if (
        (
          await stat(
            /* turbopackIgnore: true */
            candidate,
          )
        ).isDirectory()
      ) {
        return candidate;
      }
    } catch {
      // Try the next location.
    }
  }

  return null;
}

/**
 * Packaged media seeding is legacy/local-only.
 *
 * SaaS tenants must never receive global seed files automatically because
 * that would recreate cross-tenant ownership ambiguity.
 */
async function seedLegacyPackagedMedia():
Promise<void> {
  const storage =
    getStorage();

  const marker =
    stateKey(
      null,
      LEGACY_MEDIA_SEED_MARKER,
    );

  if (
    await storage.exists(marker)
  ) {
    return;
  }

  const source =
    await packagedUploadsDir();

  if (source) {
    const entries =
      await readdir(
        /* turbopackIgnore: true */
        source,
        {
          withFileTypes: true,
        },
      );

    for (
      const entry
      of entries.sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
          ),
      )
    ) {
      if (
        !entry.isFile() ||
        !IMAGE_EXTENSION.test(
          entry.name,
        )
      ) {
        continue;
      }

      const key =
        uploadKey(
          null,
          entry.name,
        );

      if (
        await storage.exists(
          key,
        )
      ) {
        continue;
      }

      await storage.write(
        key,
        await readFile(
          /* turbopackIgnore: true */
          path.join(
            /* turbopackIgnore: true */
            source,
            entry.name,
          ),
        ),
      );
    }
  }

  await storage.write(
    marker,
    new Date()
      .toISOString(),
  );
}

async function ensureMediaScope(
  siteId: string | null,
): Promise<void> {
  if (siteId) {
    return;
  }

  if (!legacySeedPromise) {
    legacySeedPromise =
      seedLegacyPackagedMedia()
        .catch(
          (error) => {
            legacySeedPromise =
              undefined;

            throw error;
          },
        );
  }

  await legacySeedPromise;
}

/**
 * Legacy/local compatibility helper.
 *
 * PostgreSQL SaaS callers must use an explicit siteId and must not invoke
 * global media seeding. Backup v1 is already blocked in PostgreSQL mode.
 */
export async function ensureMediaSeed():
Promise<void> {
  await ensureMediaScope(
    null,
  );
}

export function safeMediaName(
  value: string,
): string {
  const portable =
    value.replaceAll(
      "\\",
      "/",
    );

  const base =
    portable
      .split("/")
      .pop() ?? "";

  return base.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
}

export async function readMediaMetadata(
  siteId: string | null,
): Promise<MediaMetadata> {
  try {
    return (
      await readStorageJson<MediaMetadata>(
        getStorage(),
        stateKey(
          siteId,
          "media.json",
        ),
      )
    ) ?? {};
  } catch {
    return {};
  }
}

export async function writeMediaMetadata(
  siteId: string | null,
  metadata: MediaMetadata,
): Promise<void> {
  await writeStorageJson(
    getStorage(),
    stateKey(
      siteId,
      "media.json",
    ),
    metadata,
  );
}

export async function mediaExists(
  siteId: string | null,
  name: string,
): Promise<boolean> {
  await ensureMediaScope(
    siteId,
  );

  return getStorage()
    .exists(
      uploadKey(
        siteId,
        safeMediaName(name),
      ),
    );
}

export async function uniqueMediaName(
  siteId: string | null,
  requested: string,
): Promise<string> {
  await ensureMediaScope(
    siteId,
  );

  if (
    !(
      await mediaExists(
        siteId,
        requested,
      )
    )
  ) {
    return requested;
  }

  const ext =
    path.extname(
      requested,
    );

  const stem =
    path.basename(
      requested,
      ext,
    );

  let index = 2;

  while (
    await mediaExists(
      siteId,
      `${stem}-${index}${ext}`,
    )
  ) {
    index += 1;
  }

  return `${stem}-${index}${ext}`;
}

export async function readMediaFile(
  siteId: string | null,
  name: string,
): Promise<Uint8Array | null> {
  await ensureMediaScope(
    siteId,
  );

  return getStorage()
    .read(
      uploadKey(
        siteId,
        safeMediaName(name),
      ),
    );
}

export async function writeMediaFile(
  siteId: string | null,
  name: string,
  data: Uint8Array,
): Promise<void> {
  await ensureMediaScope(
    siteId,
  );

  await getStorage()
    .write(
      uploadKey(
        siteId,
        safeMediaName(name),
      ),
      data,
    );
}

export async function deleteMediaFile(
  siteId: string | null,
  name: string,
): Promise<void> {
  await ensureMediaScope(
    siteId,
  );

  await getStorage()
    .delete(
      uploadKey(
        siteId,
        safeMediaName(name),
      ),
    );
}

export async function describeMediaFile(
  siteId: string | null,
  name: string,
  metadata:
    MediaMetadata = {},
): Promise<MediaFile | null> {
  await ensureMediaScope(
    siteId,
  );

  const safe =
    safeMediaName(name);

  const details =
    await getStorage()
      .stat(
        uploadKey(
          siteId,
          safe,
        ),
      );

  if (!details) {
    return null;
  }

  return {
    name:
      safe,

    /**
     * Public URL deliberately contains no tenant identifier.
     * Hostname -> tenant resolution provides the ownership boundary.
     */
    url:
      `/uploads/${safe}`,

    size:
      details.size,

    modifiedAt:
      details.mtime > 0
        ? new Date(
            details.mtime,
          ).toISOString()
        : "",

    alt:
      metadata[safe]
        ?.alt ?? "",
  };
}

export async function listMediaFiles(
  siteId: string | null,
): Promise<MediaFile[]> {
  await ensureMediaScope(
    siteId,
  );

  const metadata =
    await readMediaMetadata(
      siteId,
    );

  const root =
    uploadKey(
      siteId,
    );

  const prefix =
    `${root}/`;

  const entries =
    (
      await getStorage()
        .list(root)
    )
      .filter(
        (entry) =>
          entry.path.startsWith(
            prefix,
          ),
      )
      .map(
        (entry) => ({
          entry,

          name:
            entry.path.slice(
              prefix.length,
            ),
        }),
      )
      .filter(
        ({ name }) =>
          Boolean(name) &&
          !name.includes("/") &&
          IMAGE_EXTENSION.test(
            name,
          ),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
          ),
      );

  return entries.map(
    ({
      entry,
      name,
    }) => ({
      name,
      url:
        `/uploads/${name}`,
      size:
        entry.size,
      modifiedAt:
        entry.mtime > 0
          ? new Date(
              entry.mtime,
            ).toISOString()
          : "",
      alt:
        metadata[name]
          ?.alt ?? "",
    }),
  );
}
