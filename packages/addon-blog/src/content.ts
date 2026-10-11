import { z } from "zod";

function safeUrl(value: string, image: boolean) {
  if (/[\u0000-\u0020\\]/.test(value) || value.startsWith("//")) return false;
  if (value.startsWith("/")) return !value.split(/[?#]/)[0]!.split("/").some(part => {
    try { return [".", ".."].includes(decodeURIComponent(part)); } catch { return true; }
  });
  try { const url = new URL(value); return (image ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol)) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
export const BlogImageSchema = z.object({
  src: z.string().max(2048).refine(value => safeUrl(value, true), "Use a local path or HTTPS image URL."),
  alt: z.string().trim().min(1).max(500),
  width: z.number().int().positive().max(20000).default(1200),
  height: z.number().int().positive().max(20000).default(800),
  caption: z.string().max(1000).default(""),
});
const text = z.string().trim().min(1).max(20000);
export const BlogBodyBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text }),
  z.object({ type: z.literal("heading"), text: text.max(200) }),
  z.object({ type: z.literal("list"), items: z.array(text).min(1).max(100), ordered: z.boolean().default(false) }),
  z.object({ type: z.literal("link"), label: text.max(200), href: z.string().max(2048).refine(value => safeUrl(value, false), "Use HTTP(S) or a local page URL.") }),
  z.object({ type: z.literal("image"), image: BlogImageSchema }),
]);
export const BlogPostSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(120),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(600),
  paragraphs: z.array(text).max(200).default([]),
  body: z.array(BlogBodyBlockSchema).max(200).optional(),
  cover: BlogImageSchema.optional(),
  seo: z.object({ title: z.string().max(200).optional(), description: z.string().max(1000).optional(), noindex: z.boolean().default(false), image: BlogImageSchema.optional() }).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
}).superRefine((post, ctx) => {
  if (post.status === "published" && !post.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "Published posts require publishedAt" });
  if (post.status === "published" && !(post.body?.length ?? post.paragraphs.length)) ctx.addIssue({ code: "custom", path: ["body"], message: "Published posts require content" });
});
export const BlogContentSchema = z.object({ projectKey: z.string().min(1), posts: z.array(BlogPostSchema).max(500).default([]) }).superRefine((content, ctx) => {
  const seen = new Set<string>();
  content.posts.forEach((post, index) => {
    if (seen.has(post.slug)) ctx.addIssue({ code: "custom", path: ["posts", index, "slug"], message: "Duplicate blog slug" });
    seen.add(post.slug);
  });
});
export type EditableBlogPost = z.infer<typeof BlogPostSchema>;
export type BlogBodyBlock = z.infer<typeof BlogBodyBlockSchema>;
export type BlogImage = z.infer<typeof BlogImageSchema>;
export function blogPostBody(post: Pick<EditableBlogPost, "body" | "paragraphs">): BlogBodyBlock[] {
  return post.body ?? post.paragraphs.map(text => ({ type: "paragraph", text }));
}
