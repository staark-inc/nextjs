import { mkdir, readFile, writeFile, rm, stat as fsStat, readdir } from "node:fs/promises";
import path from "node:path";
import { normalizeStoragePath, StorageError, type StaarkStorage, type StorageEntry } from "./types.ts";

/**
 * Filesystem driver — the default. Maps storage paths under a root directory
 * (`content/`, `.staark/` … live inside it). Correct on a VPS/Docker persistent
 * disk; on serverless the disk is read-only at runtime, so use the S3 driver for
 * anything the admin writes.
 */
export class FsStorage implements StaarkStorage {
  private readonly root: string;
  constructor(root: string) {
    this.root = root;
  }

  private full(p: string): string {
    const rel = normalizeStoragePath(p);
    const full = path.resolve(this.root, rel);
    // Defense in depth: the resolved path must stay inside the root.
    const rootResolved = path.resolve(this.root);
    if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
      throw new StorageError(`Resolved path escapes storage root: ${p}`);
    }
    return full;
  }

  async read(p: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.full(p));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async readText(p: string): Promise<string | null> {
    const bytes = await this.read(p);
    return bytes === null ? null : Buffer.from(bytes).toString("utf8");
  }

  async write(p: string, data: Uint8Array | string): Promise<void> {
    const full = this.full(p);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, typeof data === "string" ? Buffer.from(data, "utf8") : data);
  }

  async delete(p: string): Promise<void> {
    await rm(this.full(p), { force: true });
  }

  async stat(p: string): Promise<StorageEntry | null> {
    try {
      const s = await fsStat(this.full(p));
      if (!s.isFile()) return null;
      return { path: normalizeStoragePath(p), size: s.size, mtime: s.mtimeMs };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async exists(p: string): Promise<boolean> {
    return (await this.stat(p)) !== null;
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const rel = prefix.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
    const base = rel === "" ? path.resolve(this.root) : this.full(rel);
    const out: StorageEntry[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      for (const entry of entries) {
        const abs = path.join(dir, String(entry.name));
        if (entry.isDirectory()) {
          await walk(abs);
        } else if (entry.isFile()) {
          const s = await fsStat(abs);
          const rootResolved = path.resolve(this.root);
          out.push({
            path: path.relative(rootResolved, abs).split(path.sep).join("/"),
            size: s.size,
            mtime: s.mtimeMs,
          });
        }
      }
    };

    await walk(base);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
}
