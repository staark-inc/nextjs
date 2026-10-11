import "server-only";
import { cookies } from "next/headers";
import { loadActiveCustomProject, resolveActiveCustomProjectDirectory } from "./custom-project";
import { loadCustomSite } from "./custom-content";
import { adminConfig, adminCookieName, readAdminSession } from "./editor-auth";
import { EditorError } from "./editor-store";

export async function editorContext() {
  const config = adminConfig();
  if (!config) throw new EditorError(503, "Editor is disabled or its credentials are not configured.");
  const project = await loadActiveCustomProject();
  if (project.runtime.config.theme.family !== "custom-base") throw new EditorError(422, "This editor currently supports Custom Base projects.");
  const directory = resolveActiveCustomProjectDirectory();
  const site = await loadCustomSite(project);
  const origin = new URL(site.url).origin;
  if (!origin.startsWith("https:") && !config.allowHttp) throw new EditorError(503, "Editor requires HTTPS. Enable CUSTOM_ADMIN_ALLOW_HTTP only for local tests.");
  const cookieName = adminCookieName(project.project.key);
  const session = readAdminSession((await cookies()).get(cookieName)?.value, config, project.project.key);
  return { config, project, directory, site, origin, cookieName, session };
}
export function requireEditorSession(context: Awaited<ReturnType<typeof editorContext>>) {
  if (!context.session) throw new EditorError(401, "Sign in to continue.");
  return context.session;
}
export function requireEditorOrigin(request: Request, context: Awaited<ReturnType<typeof editorContext>>, csrf = true) {
  if (request.headers.get("origin") !== context.origin) throw new EditorError(403, "Invalid request origin.");
  if (csrf && request.headers.get("x-admin-csrf") !== requireEditorSession(context).csrf) throw new EditorError(403, "Session verification failed. Sign in again.");
}
