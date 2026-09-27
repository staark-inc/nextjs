import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FsStorage, normalizeStoragePath, readJson, writeJson, StorageError } from "../src/storage/index.ts";

test("normalizeStoragePath strips leading slashes and blocks traversal", () => {
  assert.equal(normalizeStoragePath("/content/site.json"), "content/site.json");
  assert.equal(normalizeStoragePath("content\\pages\\home.json"), "content/pages/home.json");
  assert.throws(() => normalizeStoragePath("../secret"), StorageError);
  assert.throws(() => normalizeStoragePath("content/../../etc/passwd"), StorageError);
  assert.throws(() => normalizeStoragePath(""), StorageError);
});

test("FsStorage round-trips write/read/stat/list/delete", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "staark-store-"));
  try {
    const store = new FsStorage(root);

    assert.equal(await store.read("content/site.json"), null);
    assert.equal(await store.exists("content/site.json"), false);

    await writeJson(store, "content/site.json", { name: "Test" });
    await store.write("content/pages/home.json", '{"path":"/"}');

    assert.deepEqual(await readJson(store, "content/site.json"), { name: "Test" });
    assert.equal(await store.exists("content/site.json"), true);

    const stat = await store.stat("content/pages/home.json");
    assert.ok(stat && stat.size > 0 && stat.path === "content/pages/home.json");

    const listed = await store.list("content");
    assert.deepEqual(listed.map((e) => e.path), ["content/pages/home.json", "content/site.json"]);

    await store.delete("content/site.json");
    assert.equal(await store.exists("content/site.json"), false);
    await store.delete("content/site.json"); // missing delete is a no-op
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("FsStorage refuses to escape its root", async () => {
  const store = new FsStorage(await mkdtemp(path.join(tmpdir(), "staark-store-")));
  await assert.rejects(() => store.write("../escape.txt", "x"), StorageError);
});
