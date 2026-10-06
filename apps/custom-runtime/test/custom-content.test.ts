import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadCustomProject } from "@staark/custom";
import { loadCustomSite, loadCustomHome, validateCustomPageBlocks } from "../lib/custom-content.ts";
import type { ThemeDefinition } from "@staark/theme-kit";

const project = loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base", variant: "studio" } } });
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "custom-content-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "content"));
  return directory;
}
test("site content cannot override manifest family and preset; missing home gets a project-specific fallback", async t => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, "content/site.json"), JSON.stringify({ projectKey: "demo", name: "Own brand", theme: { family: "light", preset: "other", overrides: { colors: { primary: "#123456" } } } }));
  const site = await loadCustomSite(project, directory);
  assert.equal(site.name, "Own brand");
  assert.equal(site.theme.family, "custom-base");
  assert.equal(site.theme.preset, "studio");
  assert.equal(site.theme.overrides?.colors?.primary, "#123456");
  assert.equal((await loadCustomHome(project, directory)).blocks[0]?.props.heading, "Demo");
});
test("content identity mismatch fails rather than sharing another project's content", async t => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, "content/home.json"), JSON.stringify({ projectKey: "other", path: "/", title: "Other", blocks: [] }));
  await assert.rejects(loadCustomHome(project, directory), /different project/);
});
test("page validation includes parent blocks and rejects unknown/duplicate blocks", () => {
  const base = { id: "custom-base", name: "Base", sections: { hero: () => null }, presets: {}, defaultPreset: "studio" } satisfies ThemeDefinition;
  const child = { ...base, id: "portfolio", parentId: "custom-base", sections: { gallery: () => null } };
  assert.doesNotThrow(() => validateCustomPageBlocks({ blocks: [{ id: "h", type: "hero" }, { id: "g", type: "gallery" }] }, child, { "custom-base": base }));
  assert.throws(() => validateCustomPageBlocks({ blocks: [{ id: "h", type: "unknown" }] }, child, { "custom-base": base }), /Unknown project block/);
  assert.throws(() => validateCustomPageBlocks({ blocks: [{ id: "h", type: "hero" }, { id: "h", type: "hero" }] }, base, {}), /Duplicate block/);
});
