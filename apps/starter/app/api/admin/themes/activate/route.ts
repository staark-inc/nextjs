import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readSite, readThemePresets, themeContentRoot, writeSite } from "@/lib/admin-theme";
import { requireAuth } from "../../guard";

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
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { theme, preset } = (await req.json()) as { theme: string; preset?: string };
  if (!theme || !/^[a-z0-9-]+$/.test(theme)) {
    return NextResponse.json({ error: "Invalid theme id." }, { status: 400 });
  }

  const presets = await readThemePresets(theme);
  const selectedPreset = preset || presets[0]?.id;
  if (selectedPreset && !presets.some((item) => item.id === selectedPreset)) {
    return NextResponse.json({ error: "Unknown preset for this theme." }, { status: 400 });
  }

  const { root: targetContentRoot, relative: contentDir } = await themeContentRoot(theme);

  const file = envPath();
  let env: string;
  try {
    env = await readFile(file, "utf8");
  } catch {
    env = "";
  }

  env = setEnvVar(env, "STAARK_THEME", theme);
  env = setEnvVar(env, "STAARK_CONTENT_DIR", contentDir);

  if (selectedPreset) {
    try {
      const site = await readSite(targetContentRoot);
      const previousTheme =
        site.theme && typeof site.theme === "object" && !Array.isArray(site.theme)
          ? (site.theme as Record<string, unknown>)
          : {};
      site.theme = { ...previousTheme, preset: selectedPreset };
      await writeSite(site, targetContentRoot);
    } catch (error) {
      return NextResponse.json(
        { error: `Could not update the selected preset: ${(error as Error).message}` },
        { status: 500 },
      );
    }
  }

  await writeFile(file, env, "utf8");

  return NextResponse.json({ ok: true, theme, preset: selectedPreset, contentDir });
}
