import { redirect } from "next/navigation";
import { editorContext } from "@/lib/editor-request";
import { editorBlogConfig, getEditorPost } from "@/lib/editor-blog";
import { CustomProjectFrame } from "@/lib/custom-frame";
import { BlogArticle } from "@/components/BlogArticle";
import "../../../[...path]/blog.css";
export default async function Preview({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const context = await editorContext();
  if (!context.session) redirect("/admin");
  const { post } = await getEditorPost(context.directory, context.project, (await searchParams).slug ?? "");
  const config = editorBlogConfig(context.project);
  return <><div className="ce-preview-bar"><strong>Saved preview · {post.status}</strong><a href="/admin">Back to workspace</a></div>
    <CustomProjectFrame project={context.project} site={context.site} appearance="blog"><main className="custom-blog"><BlogArticle post={post} basePath={config.basePath} title={config.title} /></main></CustomProjectFrame></>;
}
