import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type MediaUsageReference = {
  source: string;
  label: string;
  field: string;
  href?: string;
};

export type MediaUsageIndex = Record<string, MediaUsageReference[]>;

function contentRoot(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir)
    ? dir
    : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(dir: string, out: string[]): Promise<void> {
  if (!(await exists(dir))) return;

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonFiles(target, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) out.push(target);
  }
}

function sourceInfo(
  relative: string,
  document: Record<string, unknown>,
): { label: string; href?: string } {
  const normalized = relative.replaceAll("\\", "/");

  if (normalized === "site.json") {
    const name = typeof document.name === "string" ? document.name : "Site";
    return { label: `Site settings · ${name}`, href: "/admin/site" };
  }

  if (normalized.startsWith("pages/") && normalized.endsWith(".json")) {
    const file = path.posix.basename(normalized);
    const title =
      typeof document.title === "string"
        ? document.title
        : file.replace(/\.json$/i, "");
    return {
      label: title,
      href: `/admin/pages/${encodeURIComponent(file)}`,
    };
  }

  return { label: normalized };
}

function fieldName(parts: Array<string | number>): string {
  if (!parts.length) return "document";
  return parts
    .map((part, index) =>
      typeof part === "number"
        ? `[${part}]`
        : `${index > 0 ? "." : ""}${part}`,
    )
    .join("");
}

function scanValue(
  value: unknown,
  parts: Array<string | number>,
  reference: Omit<MediaUsageReference, "field">,
  index: MediaUsageIndex,
  seen: Set<string>,
): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\/uploads\/([a-zA-Z0-9._-]+)/g)) {
      const name = match[1];
      if (!name) continue;

      const field = fieldName(parts);
      const key = `${name}\0${reference.source}\0${field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (index[name] ??= []).push({ ...reference, field });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, itemIndex) =>
      scanValue(item, [...parts, itemIndex], reference, index, seen),
    );
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      scanValue(nested, [...parts, key], reference, index, seen);
    }
  }
}

export async function buildMediaUsageIndex(): Promise<MediaUsageIndex> {
  const root = contentRoot();
  const files: string[] = [];
  await collectJsonFiles(root, files);

  const index: MediaUsageIndex = {};
  const seen = new Set<string>();

  for (const file of files.sort()) {
    try {
      const document = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      const source = path.relative(root, file).replaceAll("\\", "/");
      const info = sourceInfo(source, document);

      scanValue(
        document,
        [],
        { source, label: info.label, ...(info.href ? { href: info.href } : {}) },
        index,
        seen,
      );
    } catch {
      // A malformed content file should not make the media library unusable.
    }
  }

  for (const references of Object.values(index)) {
    references.sort((a, b) =>
      `${a.source}:${a.field}`.localeCompare(`${b.source}:${b.field}`),
    );
  }

  return index;
}

export async function findMediaUsage(name: string): Promise<MediaUsageReference[]> {
  const index = await buildMediaUsageIndex();
  return index[name] ?? [];
}
