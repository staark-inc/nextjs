import assert from "node:assert/strict";
import test from "node:test";
import { initializePublishedPages } from "../lib/initial-page-publication.ts";

test("new initial pages are created and published", async () => {
  const created: string[] = [];
  const published: string[] = [];

  await initializePublishedPages(
    [{ path: "/" }, { path: "/kontakt" }, { path: "/om-oss" }],
    {
      findExisting: async () => null,
      create: async (page) => {
        created.push(page.path);
        return { id: page.path };
      },
      publish: async (_id, page) => {
        published.push(page.path);
      },
    },
  );

  assert.deepEqual(created, ["/", "/kontakt", "/om-oss"]);
  assert.deepEqual(published, created);
});

test("existing pages are not changed or republished", async () => {
  const operations: string[] = [];

  await initializePublishedPages(
    [{ path: "/" }, { path: "/kontakt" }],
    {
      findExisting: async (path) =>
        path === "/" ? { id: "existing-home" } : null,
      create: async (page) => {
        operations.push(`create:${page.path}`);
        return { id: "new-contact" };
      },
      publish: async (_id, page) => {
        operations.push(`publish:${page.path}`);
      },
    },
  );

  assert.deepEqual(operations, [
    "create:/kontakt",
    "publish:/kontakt",
  ]);
});

test("publication failure propagates to the transaction owner", async () => {
  await assert.rejects(
    initializePublishedPages(
      [{ path: "/" }],
      {
        findExisting: async () => null,
        create: async () => ({ id: "home" }),
        publish: async () => {
          throw new Error("publication failed");
        },
      },
    ),
    /publication failed/,
  );
});
