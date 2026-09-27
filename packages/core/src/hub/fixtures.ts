import { PageSchema, SiteSettingsSchema, type FormSubmission, type Page, type PageSummary, type SiteSettings } from "../schema";
import { getStorage, readJson, type StaarkStorage } from "../storage";

/**
 * Local content used when no Hub pairing is configured: `content/site.json`
 * plus one JSON file per page in `content/pages/`. Same shapes as the Hub API.
 *
 * Reads go through the storage driver (fs by default, s3 on serverless), so the
 * public site works the same on a VPS/Docker disk and on object storage.
 */

function join(dir: string, ...rest: string[]): string {
  const base = dir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return [base, ...rest].filter(Boolean).join("/");
}

export async function fixtureSite(contentDir: string, storage: StaarkStorage = getStorage()): Promise<SiteSettings> {
  const data = await readJson<unknown>(storage, join(contentDir, "site.json"));
  if (data === null) throw new Error(`[staark] Missing content: ${join(contentDir, "site.json")}`);
  return SiteSettingsSchema.parse(data);
}

async function allPages(contentDir: string, storage: StaarkStorage): Promise<Page[]> {
  const entries = await storage.list(join(contentDir, "pages"));
  const jsonFiles = entries.filter((e) => e.path.endsWith(".json")).sort((a, b) => a.path.localeCompare(b.path));
  return Promise.all(
    jsonFiles.map(async (entry) => {
      const raw = await readJson<unknown>(storage, entry.path);
      const result = PageSchema.safeParse(raw);
      if (!result.success) {
        throw new Error(`[staark] Invalid fixture page ${entry.path}: ${result.error.message}`);
      }
      return result.data;
    }),
  );
}

export async function fixturePages(contentDir: string, storage: StaarkStorage = getStorage()): Promise<PageSummary[]> {
  return (await allPages(contentDir, storage)).map((p) => ({ path: p.path, updatedAt: p.updatedAt, noindex: p.seo.noindex }));
}

export async function fixturePage(contentDir: string, pagePath: string, storage: StaarkStorage = getStorage()): Promise<Page | null> {
  return (await allPages(contentDir, storage)).find((p) => p.path === pagePath) ?? null;
}

/**
 * Dev/self-host stand-in for S-Hub Inbox. Appends one JSON line to
 * `.staark/submissions.jsonl` — the exact file and format the admin Inbox reads —
 * but through the storage driver so it also works on the S3 backend.
 */
export async function fixtureSubmit(submission: Omit<FormSubmission, "token" | "website">, storage: StaarkStorage = getStorage()): Promise<void> {
  const line = JSON.stringify({ ...submission, receivedAt: new Date().toISOString() }) + "\n";
  const existing = (await storage.readText(".staark/submissions.jsonl")) ?? "";
  await storage.write(".staark/submissions.jsonl", existing + line);
  console.info(`[staark] Form "${submission.formId}" stored in .staark/submissions.jsonl via storage driver.`);
}
