import { z } from "zod";

export const BlogConfigSchema = z.object({
  basePath: z.string().regex(/^\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/)
    .refine(value => !["api", "dashboard", "media", "admin", "_next"].includes(value.split("/")[1]!), "Reserved blog path")
    .default("/blog"),
  title: z.string().trim().min(1).max(160).default("Blog"),
  description: z.string().trim().max(500).default("Nyheter och inspiration från oss."),
});

export type BlogConfig = z.infer<typeof BlogConfigSchema>;

/** null means this URL is not owned by the blog; an empty slug is its index. */
export function matchBlogPath(basePath: string, segments: readonly string[]): string | null {
  const base = basePath.slice(1).split("/");
  if (!base.every((segment, index) => segments[index] === segment)) return null;
  const rest = segments.slice(base.length);
  if (rest.length > 1) return null;
  const slug = rest[0] ?? "";
  return slug === "" || /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}
