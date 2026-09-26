import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../guard";

const SUBMISSIONS_FILE = path.join(process.cwd(), ".staark", "submissions.jsonl");

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;

  let lines: string[];
  try {
    const raw = await readFile(SUBMISSIONS_FILE, "utf8");
    lines = raw.trim().split("\n").filter(Boolean);
  } catch {
    lines = [];
  }

  const submissions = lines.map((line, i) => {
    try {
      return { ...JSON.parse(line), _index: i };
    } catch {
      return null;
    }
  }).filter(Boolean).reverse();

  return NextResponse.json(submissions);
}

export async function DELETE() {
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    await writeFile(SUBMISSIONS_FILE, "", "utf8");
  } catch {}

  return NextResponse.json({ ok: true });
}
