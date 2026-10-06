import type { Preset } from "@staark/theme-kit";
import studio from "../presets/studio.json" with { type: "json" };
import midnight from "../presets/midnight.json" with { type: "json" };
import gallery from "../presets/gallery.json" with { type: "json" };

export const customBasePresets: Record<string, Preset> = { studio, midnight, gallery };
