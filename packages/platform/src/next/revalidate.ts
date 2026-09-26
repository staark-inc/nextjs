import { revalidatePath, revalidateTag } from "next/cache";
import { CLIENT_VERSION, verifySignature, type StaarkContent } from "@staark/core/server";

/**
 * Webhook Staark Hub calls when content changes:
 *
 *   POST /api/staark/revalidate   { "tags": ["staark:page:/priser"], "paths": ["/priser"] }
 *   GET  /api/staark/revalidate   → signed status ping (like /wordpress/ping, reversed)
 *
 * Requests must carry the connector signature made with this site's secret.
 * Only `staark` tags are accepted, so a leaked URL cannot purge unrelated cache.
 */
export function createRevalidateRoute(content: StaarkContent) {
  const { connection } = content;

  async function verify(req: Request, body: string) {
    const url = new URL(req.url);
    return verifySignature({
      method: req.method,
      path: url.pathname + url.search,
      body,
      headers: req.headers,
      siteId: connection.siteId,
      secret: connection.secret,
    });
  }

  return {
    async GET(req: Request): Promise<Response> {
      const check = await verify(req, "");
      if (!check.ok) return Response.json({ ok: false, error: `Unauthorized (${check.reason}).` }, { status: 401 });
      return Response.json({ ok: true, client: "nextjs", version: CLIENT_VERSION, source: connection.source });
    },

    async POST(req: Request): Promise<Response> {
      const body = await req.text();
      const check = await verify(req, body);
      if (!check.ok) return Response.json({ ok: false, error: `Unauthorized (${check.reason}).` }, { status: 401 });

      let payload: { tags?: unknown; paths?: unknown } = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
      }

      const tags = (Array.isArray(payload.tags) ? payload.tags : ["staark"])
        .filter((t): t is string => typeof t === "string" && (t === "staark" || t.startsWith("staark:")))
        .slice(0, 100);
      const paths = (Array.isArray(payload.paths) ? payload.paths : [])
        .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
        .slice(0, 100);

      // expire: 0 → the next request fetches fresh content from the Hub.
      for (const tag of tags) revalidateTag(tag, { expire: 0 });
      for (const p of paths) revalidatePath(p);

      return Response.json({ ok: true, revalidated: { tags, paths }, at: new Date().toISOString() });
    },
  };
}
