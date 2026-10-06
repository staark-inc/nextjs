import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadCustomProjectFromDirectory } from "@staark/custom/source";
import { createBlogService } from "@staark/addon-blog";
import { loadCustomHome, loadCustomSite, loadCustomPage } from "../lib/custom-content.ts";
import { customBaseBlockSchemas } from "@staark/theme-custom-base/blocks";
const studioDir = path.resolve(import.meta.dirname, "../project");
const formaDir = path.resolve(import.meta.dirname, "../../../examples/custom-projects/forma-demo");
test("second demo owns different pages, presets and block props", async () => {
  const studio = await loadCustomProjectFromDirectory(studioDir);
  const forma = await loadCustomProjectFromDirectory(formaDir);
  assert.equal(studio.runtime.config.theme.variant, "studio");
  assert.equal(forma.runtime.config.theme.variant, "midnight");
  assert.equal((await loadCustomSite(forma, formaDir)).name, "Forma Atelier");
  assert.notEqual((await loadCustomHome(studio, studioDir)).blocks[0]?.props.heading, (await loadCustomHome(forma, formaDir)).blocks[0]?.props.heading);
  assert.equal(await loadCustomPage(forma, ["om-oss"], formaDir), null);
  assert.equal(await loadCustomPage(studio, ["ateljen"], studioDir), null);
  for (const name of ["home.json", "pages/ateljen.json", "pages/kollektion.json", "pages/kontakt.json"]) {
    const page = JSON.parse(await readFile(path.join(formaDir, "content", name), "utf8"));
    assert.equal(page.projectKey, "forma-demo");
    for (const block of page.blocks) assert.doesNotThrow(() => customBaseBlockSchemas[block.type as keyof typeof customBaseBlockSchemas].parse(block.props));
  }
  await assert.rejects(loadCustomHome(studio, formaDir), /different project/);
});
test("both blogs serve only their own published articles", async () => {
  const a = createBlogService({ projectKey: "custom-demo", projectDirectory: studioDir, config: {} });
  const b = createBlogService({ projectKey: "forma-demo", projectDirectory: formaDir, config: { basePath: "/journal" } });
  const studioPosts = await a.list();const formaPosts = await b.list();
  assert.equal(formaPosts.length, 2);
  assert.ok(formaPosts.every(post => !studioPosts.some(other => other.slug === post.slug)));
  assert.equal(await a.get("material-och-minne"), null);
  assert.equal(await b.get("valkommen-till-bloggen"), null);
  assert.equal(await b.get("nasta-kollektion"), null);
});
