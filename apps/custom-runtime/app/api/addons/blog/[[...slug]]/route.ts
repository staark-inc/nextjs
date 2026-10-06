import { NextResponse } from "next/server";
import { loadCustomBlog } from "@/lib/custom-blog";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  try {
    const { blog } = await loadCustomBlog();
    const segments = (await context.params).slug ?? [];
    if (!blog || segments.length > 1) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    if (!segments.length) return NextResponse.json({ posts: await blog.list() }, { headers });
    const post = await blog.get(segments[0]!);
    return post ? NextResponse.json({ post }, { headers }) : NextResponse.json({ error: "Not found" }, { status: 404, headers });
  } catch {
    return NextResponse.json({ error: "Blog is temporarily unavailable" }, { status: 503, headers });
  }
}
