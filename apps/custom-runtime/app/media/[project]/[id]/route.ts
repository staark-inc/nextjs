import { loadActiveCustomProject, resolveActiveCustomProjectDirectory } from "@/lib/custom-project";
import { readPublicMedia } from "@/lib/editor-media";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ project: string; id: string }> }) {
  try {
    const selected = await loadActiveCustomProject();
    const requested = await params;
    const bytes = await readPublicMedia(resolveActiveCustomProjectDirectory(), selected.project.key, requested.project, requested.id);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return new Response("Image not found.", { status: 404, headers: { "Cache-Control": "no-store" } }); }
}
