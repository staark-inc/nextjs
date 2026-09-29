import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readSite, readSiteTheme, writeSite } from "@/lib/admin-theme";
import { getThemeRuntime, resolveThemeRuntime } from "@/lib/theme-runtime";
import { evaluateThemeCompatibility, scanThemeBlockUsage } from "@/lib/theme-compatibility";
import { requireManager } from "../../guard";
import { appendAdminLog } from "@/lib/admin-logs";

export async function POST(req: Request) {
  const blocked = await requireManager();
  if (blocked) return blocked;

  const { theme, preset } = (await req.json()) as { theme: string; preset?: string };
  const runtime =
    theme && /^[a-z0-9-]+$/.test(theme)
      ? getThemeRuntime(theme)
      : undefined;
  if (!runtime) {
    return NextResponse.json({ error: "Invalid theme id." }, { status: 400 });
  }

  const presetIds = Object.keys(runtime.theme.presets);
  const selectedPreset = preset || runtime.theme.defaultPreset;
  if (!presetIds.includes(selectedPreset)) {
    return NextResponse.json({ error: "Unknown preset for this theme." }, { status: 400 });
  }

  const compatibility = evaluateThemeCompatibility(
    runtime.id,
    await scanThemeBlockUsage(),
  );
  if (!compatibility.compatible) {
    const types = compatibility.incompatible.map((item) => item.type).join(", ");
    return NextResponse.json(
      {
        error: `Theme "${runtime.id}" is incompatible with current content: ${types}. Replace those blocks before activating it.`,
        compatibility,
      },
      { status: 409 },
    );
  }

  const site = await readSite();
  const current = readSiteTheme(site);
  const currentFamily = resolveThemeRuntime(current.family).id;
  const nextTheme =
    site.theme && typeof site.theme === "object" && !Array.isArray(site.theme)
      ? { ...(site.theme as Record<string, unknown>) }
      : {};

  // Overrides and Theme Studio provenance belong to the family they were
  // authored against. Never carry them across a family switch.
  if (currentFamily !== runtime.id) {
    delete nextTheme.overrides;
    delete nextTheme.components;
    delete nextTheme.studio;
  }

  nextTheme.family = runtime.id;
  nextTheme.preset = selectedPreset;
  site.theme = nextTheme;
  await writeSite(site);
  revalidatePath("/", "layout");

  await appendAdminLog({
    area: "theme",
    action: "theme.activated",
    message: `Theme "${runtime.id}" was activated.`,
    meta: {
      theme: runtime.id,
      preset: selectedPreset,
      previousTheme: currentFamily,
    },
  });

  return NextResponse.json({
    ok: true,
    theme: runtime.id,
    preset: selectedPreset,
    contentDir: process.env.STAARK_CONTENT_DIR?.trim() || "content",
    restartRequired: false,
  });
}
