import { NextResponse } from "next/server";
import { customBaseBlockDefinitions, customBaseShortcuts } from "@staark/theme-custom-base/blocks";
import { editorContext, requireEditorOrigin, requireEditorSession } from "@/lib/editor-request";
import { ADMIN_SESSION_SECONDS, createAdminSession, verifyAdminPassword } from "@/lib/editor-auth";
import { EditorError, getEditorPage, listEditorPages, MAX_EDITOR_BYTES, saveEditorPage } from "@/lib/editor-store";
import { allowFormRequest, readFormJson } from "@/lib/form-request";

import { getEditorPost, listEditorPosts, saveEditorPost } from "@/lib/editor-blog";
import { listEditorMedia, readUploadBody, uploadEditorMedia } from "@/lib/editor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = { params: Promise<{ action: string[] }> };
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
function failure(error: unknown) {
  if (error instanceof EditorError) return json({ error: error.message }, error.status);
  const code = (error as NodeJS.ErrnoException)?.code;
  if (["EROFS", "EACCES", "EPERM"].includes(code ?? "")) return json({ error: "Project storage is read-only. Enable the editor volume and give UID 1001 write access." }, 507);
  return json({ error: "Editor operation failed. Check project configuration and storage." }, 500);
}
async function body(request: Request) {
  try { return await readFormJson(request, MAX_EDITOR_BYTES) as Record<string, unknown>; }
  catch { throw new EditorError(400, "Send valid JSON, up to 1 MiB."); }
}
export async function GET(request: Request, { params }: Props) {
  try {
    const action = (await params).action.join("/");
    const context = await editorContext();
    const session = requireEditorSession(context);
    if (action === "bootstrap") return json({ project: context.project.project, theme: context.project.runtime.config.theme,
      addons: context.project.runtime.config.addons.filter(addon => addon.enabled).map(addon => addon.key),
      csrf: session.csrf, pages: await listEditorPages(context.directory, context.project),
      blocks: customBaseBlockDefinitions, shortcuts: customBaseShortcuts });
    if (action === "blog/posts") return json(await listEditorPosts(context.directory, context.project));
    if (action === "blog/post") return json(await getEditorPost(context.directory, context.project, new URL(request.url).searchParams.get("slug") ?? ""));
    if (action === "media") return json({ items: await listEditorMedia(context.directory, context.project.project.key) });
    if (action === "page") return json(await getEditorPage(context.directory, context.project, new URL(request.url).searchParams.get("path") ?? "/"));
    return json({ error: "Unknown editor endpoint." }, 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: Props) {
  try {
    const action = (await params).action.join("/");
    const context = await editorContext();
    requireEditorOrigin(request, context, action !== "login");
    if (action === "login") {
      // Global per-project bucket: untrusted forwarded headers cannot bypass the limit.
      if (!allowFormRequest(`admin-login:${context.project.project.key}`, 5)) return json({ error: "Too many sign-in attempts. Retry in 10 minutes." }, 429);
      const input = await body(request);
      if (!input || typeof input.username !== "string" || input.username.length > 100 || typeof input.password !== "string" || !(await verifyAdminPassword(context.config, input.username, input.password))) return json({ error: "Invalid username or password." }, 401);
      const { token } = createAdminSession(context.config, context.project.project.key);
      const response = json({ ok: true });
      response.cookies.set(context.cookieName, token, { httpOnly: true, secure: context.origin.startsWith("https:"), sameSite: "strict", path: "/", maxAge: ADMIN_SESSION_SECONDS });
      return response;
    }
    if (action === "media") {
      requireEditorSession(context);
      if (!allowFormRequest(`admin-media:${context.project.project.key}`, 30)) throw new EditorError(429, "Too many uploads. Retry in 10 minutes.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(request.headers.get("content-type") ?? "")) throw new EditorError(415, "Upload JPEG, PNG or static WebP.");
      const query = new URL(request.url).searchParams;
      return json(await uploadEditorMedia(context.directory, context.project.project.key, await readUploadBody(request), query.get("alt") ?? "", query.get("name") ?? ""), 201);
    }
    if (action === "logout") {
      const response = json({ ok: true });
      response.cookies.set(context.cookieName, "", { httpOnly: true, secure: context.origin.startsWith("https:"), sameSite: "strict", path: "/", maxAge: 0 });
      return response;
    }
    return json({ error: "Unknown editor endpoint." }, 404);
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request, { params }: Props) {
  try {
    const context = await editorContext();
    requireEditorSession(context);
    requireEditorOrigin(request, context);
    const action = (await params).action.join("/");
    if (!["page", "blog/post"].includes(action)) return json({ error: "Unknown editor endpoint." }, 404);
    const input = await body(request);
    if (!input || (input.revision !== null && (typeof input.revision !== "string" || !/^[a-f0-9]{64}$/.test(input.revision)))) throw new EditorError(400, "Supply a page revision, or null for a new page.");
    if (action === "blog/post") {
      if (typeof input.projectKey !== "string" || !(input.originalSlug === null || typeof input.originalSlug === "string")) throw new EditorError(400, "Supply the project and original article slug.");
      return json(await saveEditorPost(context.directory, context.project, { projectKey: input.projectKey, post: input.post, originalSlug: input.originalSlug, revision: input.revision as string | null }));
    }
    return json(await saveEditorPage(context.directory, context.project, input.page, input.revision as string | null));
  } catch (error) { return failure(error); }
}
