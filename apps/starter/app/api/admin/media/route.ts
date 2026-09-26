import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "../guard";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i;

type MediaMetadata = Record<string, { alt?: string }>;

function uploadsDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

function metadataFile(): string {
  return path.join(process.cwd(), ".staark", "media.json");
}

function safeName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function readMetadata(): Promise<MediaMetadata> {
  try {
    return JSON.parse(await readFile(metadataFile(), "utf8")) as MediaMetadata;
  } catch {
    return {};
  }
}

async function writeMetadata(metadata: MediaMetadata): Promise<void> {
  await mkdir(path.dirname(metadataFile()), { recursive: true });
  await writeFile(metadataFile(), JSON.stringify(metadata, null, 2) + "\n", "utf8");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uniqueName(dir: string, requested: string): Promise<string> {
  if (!(await fileExists(path.join(dir, requested)))) return requested;
  const ext = path.extname(requested);
  const stem = path.basename(requested, ext);
  let index = 2;
  while (await fileExists(path.join(dir, `${stem}-${index}${ext}`))) index += 1;
  return `${stem}-${index}${ext}`;
}

async function describeFile(dir: string, name: string, metadata: MediaMetadata) {
  const details = await stat(path.join(dir, name));
  return {
    name,
    url: `/uploads/${name}`,
    size: details.size,
    modifiedAt: details.mtime.toISOString(),
    alt: metadata[name]?.alt ?? "",
  };
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const dir = uploadsDir();
  try {
    await mkdir(dir, { recursive: true });
    const [entries, metadata] = await Promise.all([readdir(dir), readMetadata()]);
    const imageNames = entries.filter((name) => IMAGE_EXTENSION.test(name)).sort((a, b) => a.localeCompare(b));
    const files = await Promise.all(imageNames.map((name) => describeFile(dir, name, metadata)));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

export async function POST(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const replace = formData.get("replace") === "true";
  const targetName = typeof formData.get("targetName") === "string" ? String(formData.get("targetName")) : "";

  if (!files.length) return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  if (replace && (files.length !== 1 || !targetName)) {
    return NextResponse.json({ error: "Replacing media requires one file and a target name." }, { status: 400 });
  }

  const metadata = await readMetadata();
  const uploaded = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is larger than 10 MB.` }, { status: 413 });
    }

    const requested = safeName(file.name);
    if (!requested || !IMAGE_EXTENSION.test(requested)) {
      return NextResponse.json({ error: `${file.name} is not a supported image file.` }, { status: 415 });
    }

    let name: string;
    if (replace) {
      name = safeName(targetName);
      if (!IMAGE_EXTENSION.test(name) || !(await fileExists(path.join(dir, name)))) {
        return NextResponse.json({ error: "The image being replaced no longer exists." }, { status: 404 });
      }
      if (path.extname(name).toLowerCase() !== path.extname(requested).toLowerCase()) {
        return NextResponse.json({ error: "Replacement image must use the same file extension to preserve its public URL." }, { status: 400 });
      }
    } else {
      name = await uniqueName(dir, requested);
    }

    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    uploaded.push(await describeFile(dir, name, metadata));
  }

  return NextResponse.json({ uploaded });
}

export async function PUT(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = (await req.json()) as { name?: string; alt?: string };
  const name = safeName(body.name ?? "");
  if (!name || !(await fileExists(path.join(uploadsDir(), name)))) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (typeof body.alt !== "string" || body.alt.length > 300) {
    return NextResponse.json({ error: "Alt text must be 300 characters or fewer." }, { status: 400 });
  }

  const metadata = await readMetadata();
  const alt = body.alt.trim();
  if (alt) metadata[name] = { ...metadata[name], alt };
  else delete metadata[name];
  await writeMetadata(metadata);

  return NextResponse.json({ ok: true, name, alt });
}

export async function DELETE(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { name: requestedName } = (await req.json()) as { name?: string };
  if (!requestedName) return NextResponse.json({ error: "Missing file name." }, { status: 400 });

  const name = safeName(requestedName);
  try {
    await unlink(path.join(uploadsDir(), name));
    const metadata = await readMetadata();
    if (metadata[name]) {
      delete metadata[name];
      await writeMetadata(metadata);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
