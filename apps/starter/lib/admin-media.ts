import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getStorage } from "@staark/platform/server";
import {
  readStateJson,
  stateExists,
  uploadsStoragePath,
  writeStateJson,
  writeStateText,
} from "./storage";

export const IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i;
/** Existing SVG assets stay readable, but new uploads are raster-only. */
export const UPLOAD_IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|avif|ico)$/i;
const MEDIA_SEED_MARKER = "media-seeded-v1";

export type MediaMetadata = Record<string, { alt?: string }>;

export type MediaFile = {
  name: string;
  url: string;
  size: number;
  modifiedAt: string;
  alt: string;
};

let mediaSeedPromise: Promise<void> | undefined;

function packagedUploadsCandidates(): string[] {
  const cwd = /* turbopackIgnore: true */ process.cwd();
  return [
    path.resolve(/* turbopackIgnore: true */ cwd, "public", "uploads"),
    path.resolve(/* turbopackIgnore: true */ cwd, "apps", "starter", "public", "uploads"),
  ];
}

async function packagedUploadsDir(): Promise<string | null> {
  for (const candidate of packagedUploadsCandidates()) {
    try {
      if ((await stat(/* turbopackIgnore: true */ candidate)).isDirectory()) return candidate;
    } catch {
      // Try the next standalone/local-dev location.
    }
  }
  return null;
}

async function seedPackagedMedia(): Promise<void> {
  if (await stateExists(MEDIA_SEED_MARKER)) return;

  const source = await packagedUploadsDir();
  if (source) {
    const storage = getStorage();
    const entries = await readdir(/* turbopackIgnore: true */ source, { withFileTypes: true });

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !IMAGE_EXTENSION.test(entry.name)) continue;
      const key = uploadsStoragePath(entry.name);
      if (await storage.exists(key)) continue;
      await storage.write(key, await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ source, entry.name)));
    }
  }

  // The marker prevents deliberately deleted packaged files from being restored
  // on every process restart.
  await writeStateText(MEDIA_SEED_MARKER, new Date().toISOString());
}

export async function ensureMediaSeed(): Promise<void> {
  if (!mediaSeedPromise) {
    mediaSeedPromise = seedPackagedMedia().catch((error) => {
      mediaSeedPromise = undefined;
      throw error;
    });
  }
  return mediaSeedPromise;
}

export function safeMediaName(value: string): string {
  const portable = value.replaceAll("\\", "/");
  const base = portable.split("/").pop() ?? "";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function readMediaMetadata(): Promise<MediaMetadata> {
  try {
    return (await readStateJson<MediaMetadata>("media.json")) ?? {};
  } catch {
    return {};
  }
}

export async function writeMediaMetadata(metadata: MediaMetadata): Promise<void> {
  await writeStateJson("media.json", metadata);
}

export async function mediaExists(name: string): Promise<boolean> {
  await ensureMediaSeed();
  return getStorage().exists(uploadsStoragePath(safeMediaName(name)));
}

export async function uniqueMediaName(requested: string): Promise<string> {
  await ensureMediaSeed();
  if (!(await mediaExists(requested))) return requested;

  const ext = path.extname(requested);
  const stem = path.basename(requested, ext);
  let index = 2;
  while (await mediaExists(`${stem}-${index}${ext}`)) index += 1;
  return `${stem}-${index}${ext}`;
}

export async function readMediaFile(name: string): Promise<Uint8Array | null> {
  await ensureMediaSeed();
  return getStorage().read(uploadsStoragePath(safeMediaName(name)));
}

export async function writeMediaFile(name: string, data: Uint8Array): Promise<void> {
  await ensureMediaSeed();
  await getStorage().write(uploadsStoragePath(safeMediaName(name)), data);
}

export async function deleteMediaFile(name: string): Promise<void> {
  await ensureMediaSeed();
  await getStorage().delete(uploadsStoragePath(safeMediaName(name)));
}

export async function describeMediaFile(
  name: string,
  metadata: MediaMetadata = {},
): Promise<MediaFile | null> {
  await ensureMediaSeed();
  const safe = safeMediaName(name);
  const details = await getStorage().stat(uploadsStoragePath(safe));
  if (!details) return null;

  return {
    name: safe,
    url: `/uploads/${safe}`,
    size: details.size,
    modifiedAt: details.mtime > 0 ? new Date(details.mtime).toISOString() : "",
    alt: metadata[safe]?.alt ?? "",
  };
}

export async function listMediaFiles(): Promise<MediaFile[]> {
  await ensureMediaSeed();
  const metadata = await readMediaMetadata();
  const prefix = `${uploadsStoragePath()}/`;

  const entries = (await getStorage().list(uploadsStoragePath()))
    .filter((entry) => entry.path.startsWith(prefix))
    .map((entry) => ({
      entry,
      name: entry.path.slice(prefix.length),
    }))
    .filter(({ name }) =>
      Boolean(name) &&
      !name.includes("/") &&
      IMAGE_EXTENSION.test(name),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map(({ entry, name }) => ({
    name,
    url: `/uploads/${name}`,
    size: entry.size,
    modifiedAt: entry.mtime > 0 ? new Date(entry.mtime).toISOString() : "",
    alt: metadata[name]?.alt ?? "",
  }));
}
