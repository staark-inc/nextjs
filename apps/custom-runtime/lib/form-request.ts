import { createHash } from "node:crypto";

// Bounded, process-local limits. Share this store externally for multi-replica deployments.
const buckets = new Map<string, { count: number; expires: number }>();
export function allowFormRequest(key: string, limit: number, now = Date.now()) {
  for (const [entry, bucket] of buckets) if (bucket.expires <= now) buckets.delete(entry);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 10000) return false;
    bucket = { count: 0, expires: now + 600000 };
    buckets.set(key, bucket);
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
export function formClientKey(request: Request, trustProxy = process.env.CUSTOM_FORMS_TRUST_PROXY === "true") {
  // Only enable behind a proxy that overwrites X-Real-IP and blocks direct access.
  const value = trustProxy ? request.headers.get("x-real-ip") ?? "unknown" : "unverified";
  return createHash("sha256").update(value.slice(0, 100)).digest("hex");
}
export async function readFormJson(request: Request, maxBytes = 16384): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("content-type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); throw new Error("size"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
