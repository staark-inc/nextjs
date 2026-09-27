import { FsStorage } from "./fs.ts";
import { S3Storage } from "./s3.ts";
import { StorageError, type StaarkStorage } from "./types.ts";

export * from "./types.ts";
export { FsStorage } from "./fs.ts";
export { S3Storage, type S3StorageOptions } from "./s3.ts";

/**
 * Build the storage driver from the environment. One switch decides where all
 * content and admin state lives, so the same code runs on a VPS/Docker disk or
 * on serverless object storage.
 *
 *   STAARK_STORAGE          "fs" (default) | "s3"
 *
 *   # fs
 *   STAARK_STORAGE_DIR      root directory (default: process.cwd())
 *
 *   # s3 (AWS S3 / Cloudflare R2 / MinIO)
 *   STAARK_S3_BUCKET        bucket name (required)
 *   STAARK_S3_REGION        region (default: "auto", fine for R2)
 *   STAARK_S3_ENDPOINT      custom endpoint for R2/MinIO (omit for AWS)
 *   STAARK_S3_PREFIX        key prefix so several sites can share a bucket
 *   STAARK_S3_ACCESS_KEY_ID / STAARK_S3_SECRET_ACCESS_KEY  (fall back to AWS_* )
 *   STAARK_S3_FORCE_PATH_STYLE  "1" for MinIO / some R2 setups
 */
export function createStorage(env: NodeJS.ProcessEnv = process.env): StaarkStorage {
  const driver = (env.STAARK_STORAGE?.trim() || "fs").toLowerCase();

  if (driver === "fs") {
    return new FsStorage(env.STAARK_STORAGE_DIR?.trim() || process.cwd());
  }

  if (driver === "s3") {
    const bucket = env.STAARK_S3_BUCKET?.trim();
    if (!bucket) throw new StorageError("STAARK_STORAGE=s3 requires STAARK_S3_BUCKET.");
    return new S3Storage({
      bucket,
      region: env.STAARK_S3_REGION?.trim() || "auto",
      endpoint: env.STAARK_S3_ENDPOINT?.trim() || undefined,
      prefix: env.STAARK_S3_PREFIX?.trim() || undefined,
      accessKeyId: (env.STAARK_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID)?.trim(),
      secretAccessKey: (env.STAARK_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY)?.trim(),
      forcePathStyle: env.STAARK_S3_FORCE_PATH_STYLE === "1",
    });
  }

  throw new StorageError(`Unknown STAARK_STORAGE driver: ${JSON.stringify(driver)} (expected "fs" or "s3").`);
}

/** One storage instance per process. */
let shared: StaarkStorage | undefined;
export function getStorage(env: NodeJS.ProcessEnv = process.env): StaarkStorage {
  if (!shared) shared = createStorage(env);
  return shared;
}
/** Test seam: replace or clear the shared instance. */
export function setStorage(storage: StaarkStorage | undefined): void {
  shared = storage;
}

/** Read and JSON-parse an object, or null if it does not exist. */
export async function readJson<T>(storage: StaarkStorage, path: string): Promise<T | null> {
  const text = await storage.readText(path);
  return text === null ? null : (JSON.parse(text) as T);
}

/** Serialize (pretty) and write an object. */
export async function writeJson(storage: StaarkStorage, path: string, value: unknown): Promise<void> {
  await storage.write(path, JSON.stringify(value, null, 2) + "\n");
}
