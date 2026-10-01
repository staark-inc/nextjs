import { createHash } from "node:crypto";
import path from "node:path";
import {
  IMAGE_EXTENSION,
  readMediaFile,
  safeMediaName,
} from "@/lib/admin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ name: string }> };

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

function etagFor(bytes: Uint8Array): string {
  return `"${createHash("sha256")
    .update(bytes)
    .digest("base64url")}"`;
}

function matchesEtag(
  header: string | null,
  etag: string,
): boolean {
  if (!header) return false;

  return header.split(",").some((value) => {
    const candidate = value.trim().replace(/^W\//, "");
    return candidate === "*" || candidate === etag;
  });
}

async function serve(
  req: Request,
  ctx: Ctx,
  head: boolean,
): Promise<Response> {
  // Source uploads stay revalidatable because Media Replace deliberately keeps
  // the public URL stable. Browser-facing optimized variants are cached by
  // next/image for 30 days (see next.config.ts).
  const requested = decodeURIComponent((await ctx.params).name);
  const name = safeMediaName(requested);

  if (!name || name !== requested || !IMAGE_EXTENSION.test(name)) {
    return new Response("Not found.", { status: 404 });
  }

  const bytes = await readMediaFile(name);
  if (!bytes) return new Response("Not found.", { status: 404 });

  const etag = etagFor(bytes);

  const contentType =
    CONTENT_TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";

  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(bytes.byteLength),
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
  };

  if (path.extname(name).toLowerCase() === ".svg") {
    responseHeaders["Content-Security-Policy"] =
      "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  if (matchesEtag(req.headers.get("if-none-match"), etag)) {
    const {
      "Content-Length": _contentLength,
      ...notModifiedHeaders
    } = responseHeaders;

    return new Response(null, {
      status: 304,
      headers: notModifiedHeaders,
    });
  }

  return new Response(head ? null : Buffer.from(bytes), {
    headers: responseHeaders,
  });
}

export async function GET(req: Request, ctx: Ctx) {
  return serve(req, ctx, false);
}

export async function HEAD(req: Request, ctx: Ctx) {
  return serve(req, ctx, true);
}
