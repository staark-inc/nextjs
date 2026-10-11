import type { LoadedCustomProject } from "@staark/custom";
import { BlogConfigSchema } from "@staark/addon-blog/config";
import { BlogContentSchema, BlogPostSchema, blogPostBody, type EditableBlogPost } from "@staark/addon-blog/content";
import { EditorError } from "./editor-store.ts";
import { readEditorJson, updateEditorJson } from "./editor-json.ts";

export function editorBlogConfig(project: LoadedCustomProject) {
  const addon = project.runtime.config.addons.find(addon => addon.key === "blog" && addon.enabled);
  if (!addon) throw new EditorError(404, "Blog addon is not enabled for this project.");
  return BlogConfigSchema.parse(addon.config);
}
function content(raw: unknown, project: LoadedCustomProject) {
  const parsed = BlogContentSchema.safeParse(raw ?? { projectKey: project.project.key, posts: [] });
  if (!parsed.success) throw new EditorError(422, "Invalid blog collection. Check project content.");
  if (parsed.data.projectKey !== project.project.key) throw new EditorError(422, "Blog belongs to a different project.");
  return parsed.data;
}
export async function listEditorPosts(directory: string, project: LoadedCustomProject) {
  const config = editorBlogConfig(project);
  const stored = await readEditorJson(directory, "content/blog.json");
  return { config, revision: stored?.revision ?? null, posts: content(stored?.data, project).posts.map(({ paragraphs: _paragraphs, body: _body, ...post }) => post) };
}
export async function getEditorPost(directory: string, project: LoadedCustomProject, slug: string) {
  editorBlogConfig(project);
  const stored = await readEditorJson(directory, "content/blog.json");
  const post = content(stored?.data, project).posts.find(post => post.slug === slug);
  if (!post) throw new EditorError(404, "Article not found.");
  return { projectKey: project.project.key, post: { ...post, body: blogPostBody(post) }, revision: stored!.revision, originalSlug: post.slug };
}
export async function saveEditorPost(directory: string, project: LoadedCustomProject, input: { projectKey: string; post: unknown; revision: string | null; originalSlug: string | null; publishNow?: boolean }) {
  editorBlogConfig(project);
  if (input.projectKey !== project.project.key) throw new EditorError(422, "Article belongs to a different project.");
  const candidate = input.publishNow === true && input.post && typeof input.post === "object" && !Array.isArray(input.post)
    ? { ...input.post, status: "published", publishedAt: new Date().toISOString() } : input.post;
  const parsed = BlogPostSchema.safeParse(candidate);
  if (!parsed.success) throw new EditorError(422, parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ").slice(0, 1200));
  const post: EditableBlogPost = { ...parsed.data, body: blogPostBody(parsed.data), updatedAt: new Date().toISOString() };
  // Body is authoritative; preserve a plain-paragraph representation for older API consumers.
  post.paragraphs = post.body!.filter(block => block.type === "paragraph").map(block => block.text);
  const images = [post.cover, post.seo?.image, ...post.body!.flatMap(block => block.type === "image" ? [block.image] : [])].filter(image => !!image);
  for (const image of images) if (image.src.startsWith("/media/") && !image.src.startsWith(`/media/${project.project.key}/`)) throw new EditorError(422, "Choose images from this project.");
  if (input.originalSlug !== null && input.originalSlug !== post.slug) throw new EditorError(422, "Existing article URLs are fixed.");
  const saved = await updateEditorJson(directory, "content/blog.json", input.revision, previous => {
    const collection = content(previous, project);
    const index = collection.posts.findIndex(item => item.slug === post.slug);
    if (input.originalSlug === null && index >= 0) throw new EditorError(409, "An article already uses this slug.");
    if (input.originalSlug !== null && index < 0) throw new EditorError(409, "Article was removed. Reload the blog.");
    if (index >= 0) collection.posts[index] = post; else collection.posts.push(post);
    return BlogContentSchema.parse(collection);
  });
  return { projectKey: project.project.key, post, revision: saved.revision, originalSlug: post.slug };
}
