import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  readSite,
  readSiteTheme,
  readThemePresets,
  sanitizeComponents,
  sanitizeOverrides,
  writeSite,
} from "@/lib/admin-theme";
import { resolveThemeRuntime } from "@/lib/theme-runtime";
import { requireAuth } from "../../guard";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const site = await readSite();
  const theme = resolveThemeRuntime(readSiteTheme(site).family).id;
  const presets = await readThemePresets(theme);
  const current = readSiteTheme(site);
  const preset = presets.some((item) => item.id === current.preset)
    ? current.preset
    : presets[0]?.id;

  return NextResponse.json({
    theme,
    preset,
    presets,
    overrides: current.overrides ?? {},
    components: current.components ?? {},
  });
}

export async function PUT(req: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const site = await readSite();
  const previous = readSiteTheme(site);
  const theme = resolveThemeRuntime(previous.family).id;
  const presets = await readThemePresets(theme);
  const preset = typeof body.preset === "string" ? body.preset : "";
  if (!presets.some((item) => item.id === preset)) {
    return NextResponse.json({ error: "Unknown preset for the active theme." }, { status: 400 });
  }

  const overrides = sanitizeOverrides(body.overrides);
  const components = sanitizeComponents(body.components);

  site.theme = {
    ...(site.theme && typeof site.theme === "object" && !Array.isArray(site.theme)
      ? (site.theme as Record<string, unknown>)
      : {}),
    family: theme,
    preset,
    ...(Object.keys(overrides).length ? { overrides } : { overrides: undefined }),
    ...(Object.keys(components).length ? { components } : { components: undefined }),
  };

  // JSON.stringify omits undefined values, so reset really removes old overrides.
  await writeSite(site);
  revalidatePath("/", "layout");

  return NextResponse.json({
    ok: true,
    theme,
    preset,
    changedPreset: previous.preset !== preset,
    overrides,
    components,
  });
}
