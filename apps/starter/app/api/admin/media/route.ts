import { NextRequest, NextResponse } from "next/server";
import { readdir, unlink, mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "../guard";

function uploadsDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const dir = uploadsDir();
  try {
    await mkdir(dir, { recursive: true });
    const files = await readdir(dir);
    const images = files.filter((f) =>
      /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i.test(f)
    );
    return NextResponse.json({
      files: images.map((f) => ({
        name: f,
        url: `/uploads/${f}`,
      })),
    });
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

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const uploaded: { name: string; url: string }[] = [];

  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const buffer = Buffer.from(await file.arrayBuffer());
    const dest = path.join(dir, safe);
    await writeFile(dest, buffer);
    uploaded.push({ name: safe, url: `/uploads/${safe}` });
  }

  return NextResponse.json({ uploaded });
}

export async function DELETE(req: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const { name } = (await req.json()) as { name?: string };
  if (!name) {
    return NextResponse.json({ error: "Missing file name." }, { status: 400 });
  }

  const safe = path.basename(name);
  const filePath = path.join(uploadsDir(), safe);

  try {
    await unlink(filePath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
