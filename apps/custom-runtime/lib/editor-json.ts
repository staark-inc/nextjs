import { lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EditorError, MAX_EDITOR_BYTES, revision, safePath } from "./editor-store.ts";

export async function readEditorJson(directory: string, relative: string) {
  const root = await realpath(directory);
  const file = await safePath(root, relative);
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size > MAX_EDITOR_BYTES) throw new EditorError(422, "Content file must be regular JSON, up to 1 MiB.");
    const text = await readFile(file, "utf8");
    return { data: JSON.parse(text) as unknown, text, revision: revision(text) };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function updateEditorJson<T>(directory: string, relative: string, expected: string | null, update: (previous: unknown | null) => T | Promise<T>) {
  const root = await realpath(directory);
  const key = revision(relative);
  const lock = await safePath(root, `.custom-editor/locks/${key}`, true);
  try { await mkdir(lock); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new EditorError(409, "Content is being saved. Retry shortly."); throw error; }
  let temp: string | undefined;
  try {
    const previous = await readEditorJson(root, relative);
    if ((previous?.revision ?? null) !== expected) throw new EditorError(409, "Content changed in another session. Reload before saving.");
    const data = await update(previous?.data ?? null);
    const text = `${JSON.stringify(data, null, 2)}\n`;
    if (Buffer.byteLength(text) > MAX_EDITOR_BYTES) throw new EditorError(422, "Content collection exceeds 1 MiB.");
    if (previous) {
      const backup = await safePath(root, `.custom-editor/history/${key}/${Date.now()}-${randomUUID()}.json`, true);
      const file = await open(/* turbopackIgnore: true */ backup, "wx", 0o600);
      try { await file.writeFile(previous.text); await file.sync(); } finally { await file.close(); }
    }
    const target = await safePath(root, relative, true);
    temp = path.join(path.dirname(target), `.editor-${randomUUID()}.tmp`);
    const file = await open(/* turbopackIgnore: true */ temp, "wx", 0o600);
    try { await file.writeFile(text); await file.sync(); } finally { await file.close(); }
    await rename(temp, target);
    return { data, revision: revision(text) };
  } finally {
    if (temp) await rm(temp, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
