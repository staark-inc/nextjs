import { NextResponse } from "next/server";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../../guard";

function envPath(): string {
  return path.resolve(process.cwd(), ".env.local");
}

function setEnvVar(env: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*`, "m");
  if (re.test(env)) {
    return env.replace(re, `${key}=${value}`);
  }
  return env.trimEnd() + `\n${key}=${value}\n`;
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const { theme, preset } = (await req.json()) as { theme: string; preset?: string };
  if (!theme || !/^[a-z0-9-]+$/.test(theme)) {
    return NextResponse.json({ error: "Invalid theme id." }, { status: 400 });
  }

  const file = envPath();
  let env: string;
  try {
    env = await readFile(file, "utf8");
  } catch {
    env = "";
  }

  // Update STAARK_THEME
  env = setEnvVar(env, "STAARK_THEME", theme);

  // Switch content dir to per-theme fixtures if available
  const themeContentDir = path.resolve(process.cwd(), "content", theme);
  try {
    await access(themeContentDir);
    env = setEnvVar(env, "STAARK_CONTENT_DIR", `content/${theme}`);
  } catch {
    // No per-theme content dir — fall back to generic content/
    env = setEnvVar(env, "STAARK_CONTENT_DIR", "content");
  }

  await writeFile(file, env, "utf8");

  return NextResponse.json({ ok: true, theme, preset, contentDir: `content/${theme}` });
}
