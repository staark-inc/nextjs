import { readFile, readdir, mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { PageSchema, SiteSettingsSchema, type FormSubmission, type Page, type PageSummary, type SiteSettings } from "../schema";

/**
 * Local content used when no Hub pairing is configured: `content/site.json`
 * plus one JSON file per page in `content/pages/`. Same shapes as the Hub API,
 * so a site can be built and themed before it is paired.
 */

function resolveDir(contentDir: string): string {
  // turbopackIgnore keeps the fixtures reader (dev/preview only) from tracing the whole project.
  return path.isAbsolute(contentDir) ? contentDir : path.join(/* turbopackIgnore: true */ process.cwd(), contentDir);
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function fixtureSite(contentDir: string): Promise<SiteSettings> {
  return SiteSettingsSchema.parse(await readJson(path.join(resolveDir(contentDir), "site.json")));
}

async function allPages(contentDir: string): Promise<Page[]> {
  const dir = path.join(resolveDir(contentDir), "pages");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => {
      const result = PageSchema.safeParse(await readJson(path.join(dir, file)));
      if (!result.success) {
        throw new Error(`[staark] Invalid fixture page ${file}: ${result.error.message}`);
      }
      return result.data;
    }),
  );
}

export async function fixturePages(contentDir: string): Promise<PageSummary[]> {
  return (await allPages(contentDir)).map((p) => ({ path: p.path, updatedAt: p.updatedAt, noindex: p.seo.noindex }));
}

export async function fixturePage(contentDir: string, pagePath: string): Promise<Page | null> {
  return (await allPages(contentDir)).find((p) => p.path === pagePath) ?? null;
}

/** Dev stand-in for S-Hub Inbox: appends submissions to .staark/submissions.jsonl. */
export async function fixtureSubmit(submission: Omit<FormSubmission, "token" | "website">): Promise<void> {
  const dir = path.join(process.cwd(), ".staark");
  await mkdir(dir, { recursive: true });
  await appendFile(
    path.join(dir, "submissions.jsonl"),
    JSON.stringify({ ...submission, receivedAt: new Date().toISOString() }) + "\n",
    "utf8",
  );
  console.info(`[staark] Form "${submission.formId}" stored locally in .staark/submissions.jsonl (fixtures mode).`);
}
