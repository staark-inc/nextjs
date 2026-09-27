# Storage

Staark reads content and writes all admin state (backups, revisions, redirects,
forms config, media metadata, submissions) through a single **storage driver**,
so the same code runs on a VPS/Docker persistent disk and on serverless object
storage. Pick the driver with one environment variable.

```
STAARK_STORAGE = fs | s3        # default: fs
```

## Why this exists

On a VPS or Docker host the filesystem is writable and persistent, so `.staark/`
and `content/` on disk are fine. On serverless (Vercel) the runtime filesystem is
**read-only** except an ephemeral `/tmp`, so anything the admin writes would be
lost. The storage abstraction lets the same deployment target either, by sending
those reads and writes to object storage instead of the local disk.

## Drivers

### `fs` (default) — VPS / Docker

```
STAARK_STORAGE=fs
STAARK_STORAGE_DIR=/data/staark      # optional; default: process.cwd()
```

Paths map under `STAARK_STORAGE_DIR` (`content/site.json`, `.staark/backups/...`).
Use a mounted volume so writes survive restarts and redeploys.

### `s3` — serverless / portable (AWS S3, Cloudflare R2, MinIO)

```
STAARK_STORAGE=s3
STAARK_S3_BUCKET=my-site                 # required
STAARK_S3_REGION=auto                    # "auto" is fine for R2
STAARK_S3_ENDPOINT=https://<acct>.r2.cloudflarestorage.com   # omit for AWS S3
STAARK_S3_PREFIX=sites/acme              # optional: share one bucket across sites
STAARK_S3_ACCESS_KEY_ID=...              # falls back to AWS_ACCESS_KEY_ID
STAARK_S3_SECRET_ACCESS_KEY=...          # falls back to AWS_SECRET_ACCESS_KEY
STAARK_S3_FORCE_PATH_STYLE=1             # for MinIO / some R2 setups
```

Install the SDK where you use this driver — it is an optional dependency, so `fs`
deployments never pull it in:

```bash
pnpm add @aws-sdk/client-s3
```

## Deployment matrix

| Host | Content editing in /admin | Recommended |
| --- | --- | --- |
| VPS / Docker (persistent volume) | yes | `fs`, `STAARK_STORAGE_DIR` on the volume |
| Vercel / serverless | yes | `s3` (R2 has no egress fees) |
| Vercel, content committed in the repo, no runtime editing | no | `fs` works for reads (writes would fail — don't edit at runtime) |

## API

Server-only, exported from `@staark/core/server` (or `@staark/core/storage`):

```ts
import { getStorage, readStorageJson, writeStorageJson } from "@staark/core/server";

const store = getStorage();                       // built from env, one per process
await writeStorageJson(store, "content/site.json", site);
const site = await readStorageJson(store, "content/site.json");
const entries = await store.list(".staark/backups"); // { path, size, mtime }[]
await store.delete(".staark/backups/old.zip");
```

Interface: `read`, `readText`, `write`, `delete`, `list`, `stat`, `exists`.
Paths are POSIX-style, relative, no leading slash, no `..` (traversal is rejected).

## Notes

- The public content reader already goes through storage, so the site renders the
  same on either driver.
- Admin write paths migrate onto this API incrementally (backups first). New
  admin features should use `getStorage()` rather than `node:fs` directly.
- `getStorage()` is memoized per process; tests can swap it with `setStorage()`.
