import { NextResponse } from "next/server";
import { FormsError, FormKeySchema, type FormsService } from "@staark/addon-forms";
import { loadActiveCustomProject } from "@/lib/custom-project";
import { loadCustomSite } from "@/lib/custom-content";
import { resolveCustomServices } from "@/lib/custom-services";
import { allowFormRequest, formClientKey, readFormJson } from "@/lib/form-request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ form: string }> };
async function resolve(context: Context) {
  const key = (await context.params).form;
  if (!FormKeySchema.safeParse(key).success) throw new FormsError(404, "Form not found");
  const project = await loadActiveCustomProject();
  const service = resolveCustomServices(project).extensions.services.get("forms") as FormsService | undefined;
  if (!service) throw new FormsError(404, "Form not found");
  return { key, project, service };
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof FormsError ? error.message : "Form is temporarily unavailable" }, { status: error instanceof FormsError ? error.status : 503, headers });
}
export async function GET(request: Request, context: Context) {
  try {
    const { key, project, service } = await resolve(context);
    if (!allowFormRequest(`read:${project.project.key}:${formClientKey(request)}`, 120)) throw new FormsError(429, "Too many requests. Try again later");
    return NextResponse.json(service.publicForm(key), { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { key, project, service } = await resolve(context);
    const site = await loadCustomSite(project);
    if (request.headers.get("origin") !== new URL(site.url).origin) throw new FormsError(403, "Submission origin is not allowed");
    // Validate availability before consuming limits or reading a request body.
    service.publicForm(key);
    if (!allowFormRequest(`client:${project.project.key}:${formClientKey(request)}`, 5) || !allowFormRequest(`project:${project.project.key}`, 30)) throw new FormsError(429, "Too many requests. Try again later");
    let body: unknown;
    try { body = await readFormJson(request); } catch { throw new FormsError(400, "Invalid form request"); }
    return NextResponse.json(await service.submit(key, body), { headers });
  } catch (error) { return failure(error); }
}
