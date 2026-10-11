import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { PageSchema } from "@staark/core";
import type { LoadedCustomProject } from "@staark/custom";
import { customBaseBlockSchemas } from "@staark/theme-custom-base/blocks";
import { customPagePath } from "./custom-content.ts";
import { resolveCustomBlogPath } from "./custom-routing.ts";

export class EditorError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const MAX_EDITOR_BYTES = 1024 * 1024;
export type EditorPage = ReturnType<typeof PageSchema.parse> & { projectKey: string; status: "draft" | "published" };
export function editorPageFile(url: string, project: LoadedCustomProject) {
  if (url === "/") return "content/home.json";
  const segments = url.startsWith("/") ? url.slice(1).split("/") : [];
  if (segments.length > 6 || url.length > 240 || customPagePath(segments) !== url || resolveCustomBlogPath(project, segments).owns) throw new EditorError(400, "Use a local page path outside reserved routes and addon routes.");
  return `content/pages/${segments.join("/")}.json`;
}
export function validateEditorPage(input: unknown, project: LoadedCustomProject): EditorPage {
  if (project.runtime.config.theme.family !== "custom-base") throw new EditorError(422, "This editor currently supports Custom Base projects.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new EditorError(422, "Invalid page.");
  const raw = input as Record<string, unknown>;
  if (raw.projectKey !== project.project.key) throw new EditorError(422, "Page belongs to a different project.");
  if (raw.status !== "draft" && raw.status !== "published") throw new EditorError(422, "Choose draft or published.");
  const result = PageSchema.safeParse(raw);
  if (!result.success) throw new EditorError(422, "Check the page title, URL and SEO fields.");
  const page = result.data;
  if (page.title.length > 200 || (page.seo.title?.length ?? 0) > 200 || (page.seo.description?.length ?? 0) > 1000) throw new EditorError(422, "Use a title up to 200 characters and a description up to 1000.");
  if (page.seo.ogImage) {
    const image = page.seo.ogImage;
    if (image.length > 2048 || /[\u0000-\u0020\\]/.test(image) || !(image.startsWith("/") && !image.startsWith("//") || /^https:\/\//i.test(image))) throw new EditorError(422, "Sharing image must use a local path or HTTPS URL.");
    try { new URL(image, "https://example.com"); } catch { throw new EditorError(422, "Invalid sharing image URL."); }
  }
  editorPageFile(page.path, project);
  if (page.path === "/" && raw.status !== "published") throw new EditorError(422, "The home page must stay published.");
  if (page.blocks.length > 100) throw new EditorError(422, "Use at most 100 blocks.");
  const ids = new Set<string>();
  for (const block of page.blocks) {
    if (ids.has(block.id) || !/^[a-zA-Z0-9_-]{1,100}$/.test(block.id)) throw new EditorError(422, "Block IDs must be unique.");
    ids.add(block.id);
    const schema = Object.hasOwn(customBaseBlockSchemas, block.type) ? customBaseBlockSchemas[block.type as keyof typeof customBaseBlockSchemas] : undefined;
    if (!schema) throw new EditorError(422, `Unsupported block: ${block.type.slice(0, 80)}.`);
    const parsed = schema.safeParse(block.props);
    if (!parsed.success) throw new EditorError(422, `${block.type}: ${parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ").slice(0, 1000)}`);
    // Validate without discarding project-owned extra properties.
    block.props = { ...block.props, ...parsed.data };
  }
  return { ...page, projectKey: project.project.key, status: raw.status };
}
function revision(text: string) { return createHash("sha256").update(text).digest("hex"); }
// Reject symlink parents and targets, including private history/lock directories.
async function safePath(root: string, relative: string, createParents = false) {
  const parts = relative.split("/");
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]!);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory())) throw new EditorError(422, "Editor storage must use regular project files and directories.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (createParents && index < parts.length - 1) {
        try { await mkdir(current); } catch (cause) { if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause; }
        const stat = await lstat(current);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new EditorError(422, "Invalid storage directory.");
      }
    }
  }
  return current;
}
async function readDocument(root: string, relative: string, project: LoadedCustomProject) {
  const file = await safePath(root, relative);
  let text: string;
  try {
    if ((await lstat(file)).size > MAX_EDITOR_BYTES) throw new EditorError(422, "Page file is too large.");
    text = await readFile(file, "utf8");
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  const raw = JSON.parse(text) as Record<string, unknown>;
  const page = validateEditorPage({ ...raw, status: raw.status ?? "published" }, project);
  if (editorPageFile(page.path, project) !== relative) throw new EditorError(422, "Page URL does not match its file.");
  return { page, revision: revision(text), text };
}
export async function getEditorPage(directory: string, project: LoadedCustomProject, url: string) {
  const item = await readDocument(await realpath(directory), editorPageFile(url, project), project);
  if (!item) throw new EditorError(404, "Page not found.");
  return { page: item.page, revision: item.revision };
}
export async function listEditorPages(directory: string, project: LoadedCustomProject) {
  const root = await realpath(directory);
  const files = ["content/home.json"];
  async function walk(relative: string, depth: number) {
    if (depth > 6) return;
    const folder = await safePath(root, relative);
    let entries;
    try { entries = await readdir(folder, { withFileTypes: true }); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new EditorError(422, "Symlinks are not supported in page storage.");
      if (entry.isDirectory() && /^[a-z0-9][a-z0-9-]*$/.test(entry.name)) await walk(`${relative}/${entry.name}`, depth + 1);
      else if (entry.isFile() && /^[a-z0-9][a-z0-9-]*\.json$/.test(entry.name)) files.push(`${relative}/${entry.name}`);
      if (files.length > 500) throw new EditorError(422, "Editor supports at most 500 pages.");
    }
  }
  await walk("content/pages", 1);
  const pages = [];
  for (const file of files) {
    const item = await readDocument(root, file, project);
    if (item) pages.push({ path: item.page.path, title: item.page.title, status: item.page.status, blocks: item.page.blocks.length, updatedAt: item.page.updatedAt });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}
export async function saveEditorPage(directory: string, project: LoadedCustomProject, input: unknown, expectedRevision: string | null) {
  const page = validateEditorPage(input, project);
  const root = await realpath(directory);
  const relative = editorPageFile(page.path, project);
  const key = revision(relative);
  const lock = await safePath(root, `.custom-editor/locks/${key}`, true);
  try { await mkdir(lock); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new EditorError(409, "Page is being saved. Retry shortly."); throw error; }
  let temp: string | undefined;
  try {
    const previous = await readDocument(root, relative, project);
    if ((previous?.revision ?? null) !== expectedRevision) throw new EditorError(409, "Page changed in another session. Reload it before saving.");
    if (previous) {
      const backup = await safePath(root, `.custom-editor/history/${key}/${Date.now()}-${randomUUID()}.json`, true);
      const handle = await open(/* turbopackIgnore: true */ backup, "wx", 0o600);
      try { await handle.writeFile(previous.text); await handle.sync(); } finally { await handle.close(); }
    }
    page.updatedAt = new Date().toISOString();
    const text = `${JSON.stringify(page, null, 2)}\n`;
    if (Buffer.byteLength(text) > MAX_EDITOR_BYTES) throw new EditorError(422, "Page is too large.");
    const target = await safePath(root, relative, true);
    temp = path.join(path.dirname(target), `.editor-${randomUUID()}.tmp`);
    const handle = await open(/* turbopackIgnore: true */ temp, "wx", 0o600);
    try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
    await rename(temp, target);
    return { page, revision: revision(text) };
  } finally {
    if (temp) await rm(temp, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
