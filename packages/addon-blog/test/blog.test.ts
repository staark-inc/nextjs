import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createBlogService, createBlogAddon } from "../src/index.ts";
import { BlogConfigSchema, matchBlogPath } from "../src/config.ts";
import { loadCustomProject, resolveCustomExtensions } from "@staark/custom";

const article = (slug: string, publishedAt = "2026-10-05T10:00:00Z", status = "published") => ({
  slug, title: slug, excerpt: "Summary", paragraphs: ["Body"], status, publishedAt,
});
async function fixture(t: { after(fn: () => Promise<void>): void }, projectKey = "demo", posts = [article("first")]) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "staark-blog-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "content"));
  await writeFile(path.join(directory, "content/blog.json"), JSON.stringify({ projectKey, posts }));
  return directory;
}
function service(directory: string, projectKey = "demo") {
  return createBlogService({ projectDirectory: directory, projectKey, config: {}, now: () => Date.parse("2026-10-06T12:00:00Z") });
}
test("public reads hide drafts and future posts, sort newest first and omit list bodies", async t => {
  const directory = await fixture(t, "demo", [article("older"), article("newer", "2026-10-06T10:00:00Z"), article("draft", undefined, "draft"), article("future", "2027-01-01T00:00:00Z")]);
  const blog = service(directory);
  const posts = await blog.list();
  assert.deepEqual(posts.map(post => post.slug), ["newer", "older"]);
  assert.equal("paragraphs" in posts[0]!, false);
  assert.equal(await blog.get("draft"), null);
  assert.equal(await blog.get("future"), null);
  assert.equal(await blog.get("../other"), null);
  assert.deepEqual((await blog.get("newer"))?.paragraphs, ["Body"]);
});
test("project content stays separate and a mismatched identity fails", async t => {
  const one = await fixture(t, "one", [article("one-post")]);
  const two = await fixture(t, "two", [article("two-post")]);
  assert.equal((await service(one, "one").list())[0]?.slug, "one-post");
  assert.equal(await service(two, "two").get("one-post"), null);
  await assert.rejects(service(one, "two").list(), /different project/);
});
test("missing content produces an empty blog but invalid/duplicate content fails", async t => {
  const directory = await fixture(t);
  await rm(path.join(directory, "content/blog.json"));
  assert.deepEqual(await service(directory).list(), []);
  await writeFile(path.join(directory, "content/blog.json"), "bad json");
  await assert.rejects(service(directory).list(), SyntaxError);
  await writeFile(path.join(directory, "content/blog.json"), JSON.stringify({ projectKey: "demo", posts: [article("same"), article("same")] }));
  await assert.rejects(service(directory).list(), /Duplicate blog slug/);
});
test("symlinked content cannot escape the project directory", async t => {
  const directory = await fixture(t);
  const other = await fixture(t);
  await rm(path.join(directory, "content/blog.json"));
  await symlink(path.join(other, "content/blog.json"), path.join(directory, "content/blog.json"));
  await assert.rejects(service(directory).list(), /within the selected project/);
});
test("disabled addon has no service and enabled addon constructs a blog", async t => {
  const directory = await fixture(t);
  const project = (enabled: boolean) => loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "light" }, addons: [{ key: "blog", enabled }] } });
  const registry = [createBlogAddon(directory)];
  assert.equal(resolveCustomExtensions(project(false), registry).services.has("blog"), false);
  assert.equal(resolveCustomExtensions(project(true), registry).services.has("blog"), true);
});
test("URL ownership supports nested configured paths and rejects unrelated routes", () => {
  assert.equal(matchBlogPath("/news/blog", ["news", "blog"]), "");
  assert.equal(matchBlogPath("/news/blog", ["news", "blog", "hello"]), "hello");
  for (const segments of [["blog"], ["news", "blog", "hello", "extra"], ["news", "blog", "../secret"]]) {
    assert.equal(matchBlogPath("/news/blog", segments), null);
  }
  for (const basePath of ["/", "/api/blog", "/admin/blog", "/blog?x=1", "//evil.example"]) {
    assert.equal(BlogConfigSchema.safeParse({ basePath }).success, false);
  }
});
