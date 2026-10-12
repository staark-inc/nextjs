/**
 * Creates and publishes initial pages without overwriting existing content.
 *
 * Call inside the caller's database transaction so draft creation and
 * publication either both succeed or both roll back.
 */
export async function initializePublishedPages<Page extends { path: string }>(
  pages: readonly Page[],
  operations: {
    findExisting: (path: string) => Promise<{ id: string } | null>;
    create: (page: Page) => Promise<{ id: string }>;
    publish: (pageId: string, page: Page) => Promise<unknown>;
  },
): Promise<void> {
  for (const page of pages) {
    const existing = await operations.findExisting(page.path);

    if (existing) continue;

    const created = await operations.create(page);
    await operations.publish(created.id, page);
  }
}
