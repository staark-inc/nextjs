import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadCustomProject } from "@staark/custom";
import { adminConfig, adminCookieName, createAdminSession, hashAdminPassword, readAdminSession, verifyAdminPassword } from "../lib/editor-auth.ts";
import { EditorError, editorPageFile, getEditorPage, listEditorPages, saveEditorPage, validateEditorPage } from "../lib/editor-store.ts";
import { loadCustomPage } from "../lib/custom-content.ts";

const project = loadCustomProject({ schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base", variant: "studio" }, addons: [{ key: "blog", config: { basePath: "/journal" } }] } });
const other = loadCustomProject({ schema: "staark-custom/v1", project: { key: "other", name: "Other", version: "1" }, runtime: { theme: { family: "custom-base" } } });
const page = { projectKey: "demo", path: "/about", title: "About", status: "draft" as const, blocks: [{ id: "hero", type: "hero", props: { heading: "Own page", artwork: false } }] };
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "custom-editor-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
test("credentials are opt-in, hashed and invalidate sessions when rotated", async () => {
  assert.equal(adminConfig({}), null);
  assert.equal(adminConfig({ CUSTOM_ADMIN_ENABLED: "true", CUSTOM_ADMIN_USERNAME: "admin", CUSTOM_ADMIN_PASSWORD_HASH: "plaintext", CUSTOM_ADMIN_SESSION_SECRET: "x".repeat(32) }), null);
  const passwordHash = await hashAdminPassword("a-long-test-password");
  const config = adminConfig({ CUSTOM_ADMIN_ENABLED: "true", CUSTOM_ADMIN_USERNAME: "admin", CUSTOM_ADMIN_PASSWORD_HASH: passwordHash, CUSTOM_ADMIN_SESSION_SECRET: "x".repeat(32) })!;
  assert.equal(await verifyAdminPassword(config, "admin", "a-long-test-password"), true);
  assert.equal(await verifyAdminPassword(config, "other", "a-long-test-password"), false);
  assert.equal(await verifyAdminPassword(config, "admin", "wrong"), false);
  const { token, session } = createAdminSession(config, "demo", 1000);
  assert.equal(readAdminSession(token, config, "demo", 1001)?.csrf, session.csrf);
  assert.equal(readAdminSession(token, config, "other", 1001), null);
  assert.equal(readAdminSession(token.slice(0, -1) + "!", config, "demo", 1001), null);
  assert.equal(readAdminSession(token, config, "demo", session.expires), null);
  assert.equal(readAdminSession(token, { ...config, passwordHash: await hashAdminPassword("another-long-password") }, "demo", 1001), null);
  assert.equal(readAdminSession(token, { ...config, secret: "y".repeat(32) }, "demo", 1001), null);
  assert.notEqual(adminCookieName("demo"), adminCookieName("other"));
});
test("reserved URLs, addon namespaces, foreign identities and unsafe props fail validation", () => {
  for (const url of ["/admin", "/admin/preview", "/api/health", "/dashboard", "/journal", "/journal/post", "/../escape", "//escape", "/UPPER", "/path/", "relative"]) assert.throws(() => editorPageFile(url, project), EditorError);
  assert.equal(editorPageFile("/guides/start", project), "content/pages/guides/start.json");
  assert.throws(() => validateEditorPage({ ...page, projectKey: "other" }, project), /different project/);
  assert.throws(() => validateEditorPage({ ...page, path: "/" }, project), /home page/);
  assert.throws(() => validateEditorPage({ ...page, blocks: [...page.blocks, ...page.blocks] }, project), /unique/);
  assert.throws(() => validateEditorPage({ ...page, blocks: [{ id: "bad", type: "hero", props: { heading: "Bad", primary: { label: "Unsafe", href: "javascript:alert(1)" } } }] }, project), /hero/);
  assert.throws(() => validateEditorPage({ ...page, blocks: [{ id: "bad", type: "toString", props: {} }] }, project), /Unsupported/);
  assert.throws(() => validateEditorPage({ ...page, status: "anything" }, project), /draft or published/);
  assert.throws(() => validateEditorPage({ ...page, seo: { ogImage: "javascript:alert(1)" } }, project), /Sharing image/);
  assert.throws(() => validateEditorPage({ ...page, seo: { ogImage: "https://[broken" } }, project), /sharing image/);
});
test("drafts preview privately, publishing changes the public page, history preserves previous bytes", async t => {
  const directory = await fixture(t);
  const first = await saveEditorPage(directory, project, page, null);
  assert.equal((await getEditorPage(directory, project, "/about")).page.status, "draft");
  assert.equal(await loadCustomPage(project, ["about"], directory), null);
  const previous = await readFile(path.join(directory, "content/pages/about.json"), "utf8");
  const published = await saveEditorPage(directory, project, { ...first.page, title: "Published title", status: "published" }, first.revision);
  assert.equal((await loadCustomPage(project, ["about"], directory))?.title, "Published title");
  assert.notEqual(published.revision, first.revision);
  const [folder] = await readdir(path.join(directory, ".custom-editor/history"));
  const [file] = await readdir(path.join(directory, ".custom-editor/history", folder!));
  assert.equal(await readFile(path.join(directory, ".custom-editor/history", folder!, file!), "utf8"), previous);
  assert.deepEqual((await listEditorPages(directory, project)).map(item => item.path), ["/about"]);
});
test("stale and concurrent saves cannot overwrite changes, including external file edits", async t => {
  const directory = await fixture(t);
  const first = await saveEditorPage(directory, project, page, null);
  const results = await Promise.allSettled([saveEditorPage(directory, project, { ...first.page, title: "A" }, first.revision), saveEditorPage(directory, project, { ...first.page, title: "B" }, first.revision)]);
  assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(results.filter(item => item.status === "rejected" && item.reason.status === 409).length, 1);
  await assert.rejects(saveEditorPage(directory, project, page, null), error => error instanceof EditorError && error.status === 409);
  const latest = await getEditorPage(directory, project, "/about");
  await writeFile(path.join(directory, "content/pages/about.json"), JSON.stringify({ ...latest.page, title: "External change" }));
  await assert.rejects(saveEditorPage(directory, project, latest.page, latest.revision), error => error instanceof EditorError && error.status === 409);
});
test("symlink parents, target files and history directories cannot write outside the project", async t => {
  const directory = await fixture(t);
  const outside = await fixture(t);
  await symlink(outside, path.join(directory, "content"), "dir");
  await assert.rejects(saveEditorPage(directory, project, page, null), /regular project/);
  assert.deepEqual(await readdir(outside), []);
  await rm(path.join(directory, "content"));
  await mkdir(path.join(directory, "content/pages"), { recursive: true });
  await writeFile(path.join(outside, "page.json"), JSON.stringify(page));
  await symlink(path.join(outside, "page.json"), path.join(directory, "content/pages/about.json"));
  await assert.rejects(getEditorPage(directory, project, "/about"), /regular project/);
  await rm(path.join(directory, "content/pages/about.json"));
  const first = await saveEditorPage(directory, project, page, null);
  await symlink(outside, path.join(directory, ".custom-editor/history"), "dir");
  await assert.rejects(saveEditorPage(directory, project, first.page, first.revision), /regular project/);
});
test("selected projects do not share pages or accept each other's documents", async t => {
  const root = await fixture(t);
  const studio = path.join(root, "demo"); const forma = path.join(root, "other");
  await mkdir(studio); await mkdir(forma);
  await saveEditorPage(studio, project, page, null);
  await saveEditorPage(forma, other, { ...page, projectKey: "other", title: "Forma" }, null);
  assert.equal((await getEditorPage(studio, project, "/about")).page.title, "About");
  assert.equal((await getEditorPage(forma, other, "/about")).page.title, "Forma");
  await assert.rejects(saveEditorPage(studio, project, { ...page, projectKey: "other" }, null), /different project/);
});
