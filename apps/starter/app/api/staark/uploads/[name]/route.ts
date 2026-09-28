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

async function serve(ctx: Ctx, head: boolean): Promise<Response> {
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

  const contentType =
    CONTENT_TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";

  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(bytes.byteLength),
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
  };

  if (path.extname(name).toLowerCase() === ".svg") {
    responseHeaders["Content-Security-Policy"] =
      "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  return new Response(head ? null : Buffer.from(bytes), {
    headers: responseHeaders,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  return serve(ctx, false);
}

export async function HEAD(_req: Request, ctx: Ctx) {
  return serve(ctx, true);
}
