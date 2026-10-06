import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { loadCustomProject } from "@staark/custom";
import { createBlogService } from "@staark/addon-blog";
import { BlogPostSchema, BlogImageSchema, BlogBodyBlockSchema, blogPostBody } from "@staark/addon-blog/content";
import { getEditorPost, listEditorPosts, saveEditorPost } from "../lib/editor-blog.ts";
import { listEditorMedia, uploadEditorMedia, readPublicMedia, readUploadBody, MAX_UPLOAD_BYTES } from "../lib/editor-media.ts";
import { EditorError, editorPageFile } from "../lib/editor-store.ts";
const project = loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base" }, addons: [{ key: "blog", config: { basePath: "/journal" } }] } });
const disabled = loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base" } } });
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blog-media-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const post = { slug: "story", title: "Story", excerpt: "Summary", paragraphs: [], body: [{ type: "heading", text: "A heading" }, { type: "paragraph", text: "<script>plain text</script>" }], status: "draft" };
test("rich content validates safe links, images, publication and legacy paragraphs", () => {
  assert.equal(BlogPostSchema.safeParse(post).success, true);
  assert.equal(BlogPostSchema.safeParse({ ...post, status: "published" }).success, false);
  assert.equal(BlogPostSchema.safeParse({ ...post, status: "published", publishedAt: new Date().toISOString(), body: [] }).success, false);
  for (const src of ["//evil.test/image", "javascript:alert(1)", "https://[broken", "/../private", "/%2e%2e/private", "https://user:pass@host/image", "/foo\\bar"]) {
    assert.equal(BlogImageSchema.safeParse({ src, alt: "Image" }).success, false, src);
  }
  for (const href of ["javascript:alert(1)", "data:text/html,test", "//evil.test", "https://[broken", "/../private"]) assert.equal(BlogBodyBlockSchema.safeParse({ type: "link", label: "Link", href }).success, false);
  assert.deepEqual(blogPostBody({ paragraphs: ["Legacy text"] }), [{ type: "paragraph", text: "Legacy text" }]);
  assert.throws(() => editorPageFile("/media/example/image", project), EditorError);
});
test("drafts and scheduled posts stay private; publishing renders rich data with SEO", async t => {
  const directory = await fixture(t);
  const service = createBlogService({ projectKey: "demo", projectDirectory: directory, config: {} });
  const first = await saveEditorPost(directory, project, { projectKey: "demo", post, revision: null, originalSlug: null });
  assert.equal((await getEditorPost(directory, project, "story")).post.body!.length, 2);
  assert.equal(await service.get("story"), null);
  const future = await saveEditorPost(directory, project, { ...first, post: { ...first.post, status: "published", publishedAt: "2099-01-01T00:00:00Z" } });
  assert.deepEqual(await service.list(), []);
  const published = await saveEditorPost(directory, project, { ...future, post: { ...future.post, publishedAt: "2025-01-01T00:00:00Z", seo: { title: "SEO story", noindex: true } } });
  assert.equal((await service.get("story"))?.seo?.title, "SEO story");
  assert.equal((await service.get("story"))?.body?.[0]?.type, "heading");
  assert.deepEqual((await service.get("story"))?.paragraphs, ["<script>plain text</script>"]);
  assert.equal("body" in (await service.list())[0]!, false);
  assert.notEqual(published.revision, first.revision);
});
test("collection revisions prevent lost updates and retain backups", async t => {
  const directory = await fixture(t);
  const first = await saveEditorPost(directory, project, { projectKey: "demo", post, revision: null, originalSlug: null });
  const bytes = await readFile(path.join(directory, "content/blog.json"), "utf8");
  const outcomes = await Promise.allSettled(["A", "B"].map(title => saveEditorPost(directory, project, { ...first, post: { ...first.post, title } })));
  assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(item => item.status === "rejected" && item.reason.status === 409).length, 1);
  const [key] = await readdir(path.join(directory, ".custom-editor/history"));
  const [file] = await readdir(path.join(directory, ".custom-editor/history", key!));
  assert.equal(await readFile(path.join(directory, ".custom-editor/history", key!, file!), "utf8"), bytes);
  await assert.rejects(saveEditorPost(directory, project, { ...first, post: { ...first.post, slug: "changed" } }), /URLs are fixed/);
});
test("blog rejects disabled addons, foreign identities, collections and image references", async t => {
  const directory = await fixture(t);
  await assert.rejects(listEditorPosts(directory, disabled), /not enabled/);
  await assert.rejects(saveEditorPost(directory, project, { projectKey: "other", post, revision: null, originalSlug: null }), /different project/);
  await assert.rejects(saveEditorPost(directory, project, { projectKey: "demo", post: { ...post, cover: { src: "/media/other/image.webp", alt: "Other" } }, revision: null, originalSlug: null }), /this project/);
  await mkdir(path.join(directory, "content"));
  await writeFile(path.join(directory, "content/blog.json"), JSON.stringify({ projectKey: "other", posts: [] }));
  await assert.rejects(listEditorPosts(directory, project), /different project/);
});
test("uploads decode, resize, remove metadata, persist and remain scoped to one project", async t => {
  const directory = await fixture(t);
  const buffer = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#6c58ee" } }).jpeg().withMetadata().toBuffer();
  const item = await uploadEditorMedia(directory, "demo", buffer, "Purple test image", "Test");
  assert.equal(item.width, 2400); assert.equal(item.height, 1200);
  assert.equal((await listEditorMedia(directory, "demo"))[0]?.src, item.src);
  const bytes = await readPublicMedia(directory, "demo", "demo", item.id);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
  await assert.rejects(readPublicMedia(directory, "demo", "other", item.id), /not found/);
  await assert.rejects(readPublicMedia(directory, "demo", "demo", "../secret"), /not found/);
  await assert.rejects(listEditorMedia(directory, "other"), /Invalid project/);
  assert.equal((await listEditorMedia(directory, "demo")).length, 1);
});
test("invalid uploads and oversized streams leave no stored images", async t => {
  const directory = await fixture(t);
  for (const bytes of [Buffer.from("<svg></svg>"), Buffer.from("GIF89a"), Buffer.from([255,216,255,0,0,0]), Buffer.alloc(MAX_UPLOAD_BYTES + 1)]) await assert.rejects(uploadEditorMedia(directory, "demo", bytes, "Alt", "Test"), EditorError);
  assert.deepEqual(await listEditorMedia(directory, "demo"), []);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_UPLOAD_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } });
  await assert.rejects(readUploadBody(new Request("http://localhost/upload", { method: "POST", body: stream, duplex: "half" } as RequestInit)), error => error instanceof EditorError && error.status === 413);
});
test("media rejects symlinks and public reads require committed metadata", async t => {
  const directory = await fixture(t); const outside = await fixture(t);
  await mkdir(path.join(directory, "content"));
  await symlink(outside, path.join(directory, "content/media"), "dir");
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(uploadEditorMedia(directory, "demo", png, "Alt", "Name"), /regular project/);
  assert.deepEqual(await readdir(outside), []);
  await rm(path.join(directory, "content/media"));
  await mkdir(path.join(directory, "content/media"));
  const id = "12345678-1234-1234-1234-123456789abc.webp";
  await writeFile(path.join(directory, "content/media", id), png);
  await assert.rejects(readPublicMedia(directory, "demo", "demo", id), /not found/);
});
