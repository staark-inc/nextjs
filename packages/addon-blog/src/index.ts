import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { BlogContentSchema, type EditableBlogPost } from "./content.ts";
import type { CustomExtensionDefinition } from "@staark/custom";
import { BlogConfigSchema, type BlogConfig } from "./config.ts";

export type BlogPost = Omit<EditableBlogPost, "status" | "publishedAt"> & { publishedAt: string };
export type BlogSummary = Omit<BlogPost, "paragraphs" | "body">;
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
    const content = BlogContentSchema.parse(JSON.parse(text));
    if (content.projectKey !== input.projectKey) throw new Error("Blog content belongs to a different project.");
    return content.posts
      .filter(post => post.status === "published" && Date.parse(post.publishedAt!) <= now())
      .map(({ status: _status, ...post }) => ({ ...post, publishedAt: post.publishedAt! }))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }
  return {
    config,
    async list() { return (await published()).map(({ paragraphs: _paragraphs, body: _body, ...summary }) => summary); },
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
