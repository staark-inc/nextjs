import { randomUUID } from "node:crypto";
import { open, readFile, realpath, rm } from "node:fs/promises";
import sharp from "sharp";
import { BlogImageSchema, type BlogImage } from "@staark/addon-blog/content";
import { EditorError, safePath } from "./editor-store.ts";
import { readEditorJson, updateEditorJson } from "./editor-json.ts";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export type MediaItem = BlogImage & { id: string; name: string; bytes: number; createdAt: string };
const idPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.webp$/;
const active = new Set<string>();
function mediaCollection(input: unknown, projectKey: string): { projectKey: string; items: MediaItem[] } {
  if (input === null) return { projectKey, items: [] };
  const data = input as { projectKey?: unknown; items?: unknown };
  if (!data || data.projectKey !== projectKey || !Array.isArray(data.items) || data.items.length > 500) throw new EditorError(422, "Invalid project image library.");
  const seen = new Set<string>();
  const items = data.items.map((raw: MediaItem) => {
    const image = BlogImageSchema.safeParse(raw);
    if (!image.success || typeof raw.id !== "string" || !idPattern.test(raw.id) || raw.src !== `/media/${projectKey}/${raw.id}` || seen.has(raw.id) || typeof raw.name !== "string" || raw.name.length > 160 || !Number.isSafeInteger(raw.bytes) || raw.bytes <= 0 || typeof raw.createdAt !== "string") throw new EditorError(422, "Invalid library image metadata.");
    seen.add(raw.id);
    return { ...image.data, id: raw.id, name: raw.name, bytes: raw.bytes, createdAt: raw.createdAt };
  });
  return { projectKey, items };
}
export async function listEditorMedia(directory: string, projectKey: string) {
  const saved = await readEditorJson(directory, "content/media.json");
  return mediaCollection(saved?.data ?? null, projectKey).items;
}
export async function uploadEditorMedia(directory: string, projectKey: string, buffer: Buffer, alt: string, name: string) {
  if (!alt.trim() || alt.length > 500 || !name.trim() || name.length > 160) throw new EditorError(422, "Provide an image name and alternative text.");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw new EditorError(413, "Use an image up to 5 MiB.");
  const magic = buffer.subarray(0, 12);
  if (!(magic.subarray(0, 3).equals(Buffer.from([255, 216, 255])) || magic.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || magic.subarray(0,4).toString() === "RIFF" && magic.subarray(8,12).toString() === "WEBP")) throw new EditorError(415, "Upload JPEG, PNG or static WebP images.");
  if (active.has(projectKey) || active.size >= 2) throw new EditorError(429, "An image upload is in progress. Retry shortly.");
  active.add(projectKey);
  let filename: string | undefined;
  try {
    let result;
    try {
      const image = sharp(buffer, { limitInputPixels: 20000000, failOn: "warning" });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1 || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Unsupported image");
      result = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    } catch { throw new EditorError(415, "Invalid, animated or oversized image. Use JPEG, PNG or static WebP, up to 20 megapixels."); }
    const root = await realpath(directory);
    const index = await readEditorJson(root, "content/media.json");
    const library = mediaCollection(index?.data ?? null, projectKey);
    if (library.items.length >= 500 || library.items.reduce((total, item) => total + item.bytes, 0) + result.data.length > 1024 * 1024 * 1024) throw new EditorError(413, "Project image library is full (500 images / 1 GiB).");
    const id = `${randomUUID()}.webp`;
    const item: MediaItem = { id, src: `/media/${projectKey}/${id}`, alt: alt.trim(), name: name.trim(), width: result.info.width, height: result.info.height, bytes: result.data.length, caption: "", createdAt: new Date().toISOString() };
    filename = await safePath(root, `content/media/${id}`, true);
    const file = await open(/* turbopackIgnore: true */ filename, "wx", 0o600);
    try { await file.writeFile(result.data); await file.sync(); } finally { await file.close(); }
    await updateEditorJson(root, "content/media.json", index?.revision ?? null, previous => ({ ...mediaCollection(previous, projectKey), items: [...mediaCollection(previous, projectKey).items, item] }));
    filename = undefined; // Persist only files whose metadata was committed.
    return item;
  } finally { if (filename) await rm(filename, { force: true }); active.delete(projectKey); }
}
export async function readPublicMedia(directory: string, projectKey: string, requestedProject: string, id: string) {
  if (requestedProject !== projectKey || !idPattern.test(id)) throw new EditorError(404, "Image not found.");
  const item = (await listEditorMedia(directory, projectKey)).find(item => item.id === id);
  if (!item) throw new EditorError(404, "Image not found.");
  const file = await safePath(await realpath(directory), `content/media/${id}`);
  return readFile(file);
}
export async function readUploadBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new EditorError(400, "Select an image.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new EditorError(413, "Use an image up to 5 MiB."); }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}
