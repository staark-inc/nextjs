import { NextResponse } from "next/server";
import {
  readSite,
  readSiteTheme,
  readThemePresets,
  sanitizeComponents,
  sanitizeOverrides,
  writeSite,
} from "@/lib/admin-theme";
import { requireAuth } from "../../guard";

function activeTheme(): string {
  return process.env.STAARK_THEME?.trim() || "salong";
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const theme = activeTheme();
  const [site, presets] = await Promise.all([readSite(), readThemePresets(theme)]);
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

  const theme = activeTheme();
  const presets = await readThemePresets(theme);
  const body = (await req.json()) as Record<string, unknown>;
  const preset = typeof body.preset === "string" ? body.preset : "";
  if (!presets.some((item) => item.id === preset)) {
    return NextResponse.json({ error: "Unknown preset for the active theme." }, { status: 400 });
  }

  const site = await readSite();
  const previous = readSiteTheme(site);
  const overrides = sanitizeOverrides(body.overrides);
  const components = sanitizeComponents(body.components);

  site.theme = {
    ...(site.theme && typeof site.theme === "object" && !Array.isArray(site.theme)
      ? (site.theme as Record<string, unknown>)
      : {}),
    preset,
    ...(Object.keys(overrides).length ? { overrides } : { overrides: undefined }),
    ...(Object.keys(components).length ? { components } : { components: undefined }),
  };

  // JSON.stringify omits undefined values, so reset really removes old overrides.
  await writeSite(site);

  return NextResponse.json({
    ok: true,
    theme,
    preset,
    changedPreset: previous.preset !== preset,
    overrides,
    components,
  });
}
