import { NextResponse } from "next/server";
import { readSite, readSiteTheme } from "@/lib/admin-theme";
import { listThemeRuntimes, resolveThemeRuntime } from "@/lib/theme-runtime";
import { evaluateThemeCompatibility, scanThemeBlockUsage } from "@/lib/theme-compatibility";
import { requireAuth } from "../guard";

type ThemeInfo = {
  id: string;
  name: string;
  description: string;
  presets: string[];
  active: boolean;
  compatibility: ReturnType<typeof evaluateThemeCompatibility>;
};

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const site = await readSite();
  const activeTheme = resolveThemeRuntime(readSiteTheme(site).family).id;
  const usage = await scanThemeBlockUsage();
  const themes: ThemeInfo[] = listThemeRuntimes().map((runtime) => ({
    id: runtime.id,
    name: runtime.name,
    description: runtime.description,
    presets: Object.keys(runtime.theme.presets).sort(),
    active: runtime.id === activeTheme,
    compatibility: evaluateThemeCompatibility(runtime.id, usage),
  }));

  return NextResponse.json({ themes, active: activeTheme });
}
