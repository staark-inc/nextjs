import assert from "node:assert/strict";
import test from "node:test";
import { loadCustomProject } from "@staark/custom";
import { PageSchema, SiteSettingsSchema } from "@staark/core";
import { resolveCustomBlogPath } from "../lib/custom-routing.ts";
import { customPageMetadata } from "../lib/custom-metadata.ts";

test("configured blog namespace takes precedence, including disabled addons and nested bases", () => {
  const project = loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base", variant: "studio" }, addons: [{ key: "blog", enabled: false, config: { basePath: "/journal/blog" } }] } });
  assert.deepEqual(resolveCustomBlogPath(project, ["journal", "blog"]), { owns: true, slug: "" });
  assert.deepEqual(resolveCustomBlogPath(project, ["journal", "blog", "post"]), { owns: true, slug: "post" });
  assert.deepEqual(resolveCustomBlogPath(project, ["journal", "blog", "post", "extra"]), { owns: true, slug: null });
  assert.equal(resolveCustomBlogPath(project, ["journal", "blogg"]).owns, false);
  assert.equal(resolveCustomBlogPath(project, ["om-oss"]).owns, false);
});
test("page metadata uses project URL, SEO overrides and explicit indexing", () => {
  const page = PageSchema.parse({ path: "/about", title: "About", seo: { title: "Our studio", description: "Our story", noindex: true, ogImage: "/cover.svg" }, blocks: [] });
  const site = SiteSettingsSchema.parse({ name: "Studio", url: "https://studio.example", locale: "sv-SE" });
  const result = customPageMetadata(page, site);
  assert.equal(result.title, "Our studio");
  assert.equal(result.description, "Our story");
  assert.deepEqual(result.alternates, { canonical: "https://studio.example/about" });
  assert.deepEqual(result.robots, { index: false, follow: true });
  assert.equal((result.openGraph as { locale: string }).locale, "sv_SE");
  assert.deepEqual((result.openGraph as { images: string[] }).images, ["https://studio.example/cover.svg"]);
});
