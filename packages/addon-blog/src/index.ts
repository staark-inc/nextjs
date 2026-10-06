import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CustomExtensionDefinition } from "@staark/custom";
import { BlogConfigSchema, type BlogConfig } from "./config.ts";

const PostSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(600),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.iso.datetime().optional(),
}).refine(post => post.status !== "published" || Boolean(post.publishedAt), "Published posts require publishedAt");

const ContentSchema = z.object({
  projectKey: z.string().min(1),
  posts: z.array(PostSchema).default([]),
}).superRefine((content, ctx) => {
  const seen = new Set<string>();
  content.posts.forEach((post, index) => {
    if (seen.has(post.slug)) ctx.addIssue({ code: "custom", path: ["posts", index, "slug"], message: "Duplicate blog slug" });
    seen.add(post.slug);
  });
});

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  publishedAt: string;
};
export type BlogSummary = Omit<BlogPost, "paragraphs">;
export type BlogService = {
  config: BlogConfig;
  list(): Promise<BlogSummary[]>;
  get(slug: string): Promise<BlogPost | null>;
};

export function createBlogService(input: {
  projectKey: string;
  projectDirectory: string;
  config: unknown;
  now?: () => number;
}): BlogService {
  const config = BlogConfigSchema.parse(input.config);
  const now = input.now ?? Date.now;
  async function published(): Promise<BlogPost[]> {
    const directory = await realpath(input.projectDirectory);
    const filename = path.join(directory, "content", "blog.json");
    let text: string;
    try {
      // External project directories are supported; content symlinks cannot
      // point outside the selected project and cross its data boundary.
      const actual = await realpath(filename);
      const relative = path.relative(directory, actual);
      if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
        throw new Error("Blog content must remain within the selected project.");
      }
      text = await readFile(actual, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const content = ContentSchema.parse(JSON.parse(text));
    if (content.projectKey !== input.projectKey) throw new Error("Blog content belongs to a different project.");
    return content.posts
      .filter(post => post.status === "published" && Date.parse(post.publishedAt!) <= now())
      .map(post => ({ slug: post.slug, title: post.title, excerpt: post.excerpt, paragraphs: post.paragraphs, publishedAt: post.publishedAt! }))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }
  return {
    config,
    async list() { return (await published()).map(({ paragraphs: _paragraphs, ...summary }) => summary); },
    async get(slug) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
      return (await published()).find(post => post.slug === slug) ?? null;
    },
  };
}

export function createBlogAddon(projectDirectory: string): CustomExtensionDefinition {
  return {
    key: "blog",
    kind: "addon",
    create: ({ project, config }) => createBlogService({ projectDirectory, projectKey: project.project.key, config }),
  };
}
