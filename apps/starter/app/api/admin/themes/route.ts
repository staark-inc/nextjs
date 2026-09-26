import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { devOnly } from "../guard";

type ThemeInfo = {
  id: string;
  name: string;
  description: string;
  presets: string[];
  active: boolean;
};

async function readJson(file: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;

  const themesRoot = path.resolve(process.cwd(), "../../themes");
  const activeTheme = process.env.STAARK_THEME?.trim() || "salong";

  let dirs: string[];
  try {
    dirs = await readdir(themesRoot);
  } catch {
    return NextResponse.json([]);
  }

  const themes: ThemeInfo[] = [];
  for (const dir of dirs.sort()) {
    const pkgPath = path.join(themesRoot, dir, "package.json");
    const presetsDir = path.join(themesRoot, dir, "presets");
    try {
      const pkg = await readJson(pkgPath);
      let presets: string[] = [];
      try {
        presets = (await readdir(presetsDir)).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
      } catch {
        // no presets dir
      }
      themes.push({
        id: dir,
        name: (pkg.description as string)?.split("—")[0]?.trim() || dir,
        description: (pkg.description as string) || "",
        presets,
        active: dir === activeTheme,
      });
    } catch {
      // skip dirs without package.json
    }
  }

  return NextResponse.json({ themes, active: activeTheme });
}
