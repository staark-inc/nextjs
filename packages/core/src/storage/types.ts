/**
 * Storage abstraction so the whole stack — public content reads AND admin writes
 * (backups, revisions, redirects, forms config, media metadata) — works the same
 * on a VPS/Docker persistent disk and on serverless (Vercel) object storage.
 *
 * Paths are POSIX-style, relative, without a leading slash and without "..".
 * A driver maps them under its own root (a directory for fs, a key prefix for s3).
 */

export type StorageEntry = {
  /** POSIX path relative to the storage root. */
  path: string;
  /** Size in bytes. */
  size: number;
  /** Last-modified epoch milliseconds (0 if the backend does not report it). */
  mtime: number;
};

export interface StaarkStorage {
  /** Raw bytes, or null if the object does not exist. */
  read(path: string): Promise<Uint8Array | null>;
  /** UTF-8 text, or null if the object does not exist. */
  readText(path: string): Promise<string | null>;
  /** Create or replace an object. Parent "directories" are created as needed. */
  write(path: string, data: Uint8Array | string): Promise<void>;
  /** Remove an object. Missing objects are a no-op. */
  delete(path: string): Promise<void>;
  /** Every object whose path starts with `prefix` (recursive), sorted by path. */
  list(prefix: string): Promise<StorageEntry[]>;
  /** Metadata for one object, or null if it does not exist. */
  stat(path: string): Promise<StorageEntry | null>;
  /** True if the object exists. */
  exists(path: string): Promise<boolean>;
}

/** A leading-slash-free, "..'"-free, backslash-free POSIX path. Throws otherwise. */
export function normalizeStoragePath(input: string): string {
  const clean = input.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (clean === "" || clean === "." ) {
    throw new StorageError(`Invalid storage path: ${JSON.stringify(input)}`);
  }
  if (clean.split("/").some((segment) => segment === "..")) {
    throw new StorageError(`Path traversal is not allowed: ${JSON.stringify(input)}`);
  }
  return clean;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}
