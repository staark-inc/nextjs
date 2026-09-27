import { normalizeStoragePath, StorageError, type StaarkStorage, type StorageEntry } from "./types.ts";

/**
 * S3-compatible driver (AWS S3, Cloudflare R2, MinIO, …). Works on serverless
 * (Vercel) and self-hosted alike, so a deployment can move between them without
 * changing code — only `STAARK_STORAGE` and the bucket env vars.
 *
 * `@aws-sdk/client-s3` is imported dynamically, so fs-only deployments never
 * bundle or install it. Install it where you use this driver:
 *   pnpm add @aws-sdk/client-s3
 */
export type S3StorageOptions = {
  bucket: string;
  region?: string;
  /** Custom endpoint for R2/MinIO (omit for AWS S3). */
  endpoint?: string;
  /** Key prefix so several sites can share one bucket. */
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** R2/MinIO usually need path-style addressing. */
  forcePathStyle?: boolean;
};

type S3Client = {
  send: (command: unknown) => Promise<unknown>;
};

export class S3Storage implements StaarkStorage {
  private clientPromise?: Promise<{ client: S3Client; cmd: Record<string, new (input: unknown) => unknown> }>;

  private readonly opts: S3StorageOptions;
  constructor(opts: S3StorageOptions) {
    if (!opts.bucket) throw new StorageError("S3 storage requires a bucket name.");
    this.opts = opts;
  }

  private key(p: string): string {
    const rel = normalizeStoragePath(p);
    return this.opts.prefix ? `${this.opts.prefix.replace(/\/+$/, "")}/${rel}` : rel;
  }

  private async sdk() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        let mod: Record<string, new (input: unknown) => unknown> & { S3Client: new (cfg: unknown) => S3Client };
        // Non-literal specifier: keeps this an optional runtime dependency that
        // TypeScript does not try to resolve at build time.
        const spec = "@aws-sdk/client-s3";
        try {
          mod = (await import(/* webpackIgnore: true */ spec)) as never;
        } catch {
          throw new StorageError(
            "STAARK_STORAGE=s3 needs the @aws-sdk/client-s3 package. Install it: pnpm add @aws-sdk/client-s3",
          );
        }
        const client = new mod.S3Client({
          region: this.opts.region ?? "auto",
          endpoint: this.opts.endpoint,
          forcePathStyle: this.opts.forcePathStyle ?? Boolean(this.opts.endpoint),
          credentials:
            this.opts.accessKeyId && this.opts.secretAccessKey
              ? { accessKeyId: this.opts.accessKeyId, secretAccessKey: this.opts.secretAccessKey }
              : undefined,
        });
        return { client, cmd: mod };
      })();
    }
    return this.clientPromise;
  }

  private async run(commandName: string, input: unknown): Promise<unknown> {
    const { client, cmd } = await this.sdk();
    const Command = cmd[commandName];
    if (!Command) throw new StorageError(`Unknown S3 command: ${commandName}`);
    return client.send(new Command(input));
  }

  async read(p: string): Promise<Uint8Array | null> {
    try {
      const res = (await this.run("GetObjectCommand", { Bucket: this.opts.bucket, Key: this.key(p) })) as {
        Body?: { transformToByteArray?: () => Promise<Uint8Array> };
      };
      if (res.Body?.transformToByteArray) return await res.Body.transformToByteArray();
      return null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async readText(p: string): Promise<string | null> {
    const bytes = await this.read(p);
    return bytes === null ? null : Buffer.from(bytes).toString("utf8");
  }

  async write(p: string, data: Uint8Array | string): Promise<void> {
    await this.run("PutObjectCommand", {
      Bucket: this.opts.bucket,
      Key: this.key(p),
      Body: typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data),
    });
  }

  async delete(p: string): Promise<void> {
    await this.run("DeleteObjectCommand", { Bucket: this.opts.bucket, Key: this.key(p) });
  }

  async stat(p: string): Promise<StorageEntry | null> {
    try {
      const res = (await this.run("HeadObjectCommand", { Bucket: this.opts.bucket, Key: this.key(p) })) as {
        ContentLength?: number;
        LastModified?: Date;
      };
      return { path: normalizeStoragePath(p), size: res.ContentLength ?? 0, mtime: res.LastModified?.getTime() ?? 0 };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async exists(p: string): Promise<boolean> {
    return (await this.stat(p)) !== null;
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const keyPrefix = this.key(prefix.replace(/\/+$/, "") || ".").replace(/\/\.$/, "/");
    const stripPrefix = this.opts.prefix ? this.opts.prefix.replace(/\/+$/, "") + "/" : "";
    const out: StorageEntry[] = [];
    let token: string | undefined;

    do {
      const res = (await this.run("ListObjectsV2Command", {
        Bucket: this.opts.bucket,
        Prefix: keyPrefix,
        ContinuationToken: token,
      })) as { Contents?: { Key?: string; Size?: number; LastModified?: Date }[]; NextContinuationToken?: string; IsTruncated?: boolean };

      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue;
        out.push({
          path: obj.Key.startsWith(stripPrefix) ? obj.Key.slice(stripPrefix.length) : obj.Key,
          size: obj.Size ?? 0,
          mtime: obj.LastModified?.getTime() ?? 0,
        });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);

    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
}

function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NoSuchKey" || e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}
