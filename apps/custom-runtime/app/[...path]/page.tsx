import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadCustomBlog } from "@/lib/custom-blog";
import { loadCustomSite, loadCustomPage, validateCustomPageBlocks } from "@/lib/custom-content";
import { resolveCustomBlogPath } from "@/lib/custom-routing";
import { customPageMetadata } from "@/lib/custom-metadata";
import { resolveCustomTheme } from "@/lib/custom-theme";
import { resolveCustomServices } from "@/lib/custom-services";
import { BlockRenderer } from "@staark/theme-kit";
import { CustomProjectFrame } from "@/lib/custom-frame";
import "./blog.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ path: string[] }> };

async function resolvePage(params: Props["params"]) {
  const { project, blog } = await loadCustomBlog();
  const segments = (await params).path;
  const route = resolveCustomBlogPath(project, segments);
  if (route.owns) {
    if (!blog || route.slug === null) notFound();
    const post = route.slug ? await blog.get(route.slug) : null;
    if (route.slug && !post) notFound();
    return { kind: "blog" as const, project, blog, post };
  }
  const page = await loadCustomPage(project, segments);
  if (!page) notFound();
  return { kind: "page" as const, project, page };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await resolvePage(params);
  if (result.kind === "page") return customPageMetadata(result.page, await loadCustomSite(result.project));
  return { title: result.post?.title ?? result.blog.config.title, description: result.post?.excerpt ?? result.blog.config.description };
}

export default async function CustomContentPage({ params }: Props) {
  const result = await resolvePage(params);
  if (result.kind === "page") {
    const { project, page } = result;
    const site = await loadCustomSite(project);
    const services = resolveCustomServices(project);
    const { theme, registry } = resolveCustomTheme(project, services.extensions.sections);
    validateCustomPageBlocks(page, theme, registry);
    return <CustomProjectFrame project={project} site={site}><main>
      <BlockRenderer blocks={page.blocks} site={site} theme={theme} registry={registry} />
    </main></CustomProjectFrame>;
  }
  const { project, blog, post } = result;
  const posts = post ? [] : await blog.list();
  const site = await loadCustomSite(project);
  return <CustomProjectFrame project={project} site={site} appearance="blog">
      <main className="custom-blog">
        {post ? (
          <article className="custom-blog__article">
            <Link className="custom-blog__back" href={blog.config.basePath}>← {blog.config.title}</Link>
            <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10)}</time>
            <h1>{post.title}</h1>
            <p className="custom-blog__intro">{post.excerpt}</p>
            <div className="custom-blog__body">
              {post.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </article>
        ) : (
          <>
            <div className="custom-blog__heading"><span className="custom-blog__eyebrow">{project.project.name}</span>
              <h1>{blog.config.title}</h1><p className="custom-blog__intro">{blog.config.description}</p>
            </div>
            {posts.length ? <div className="custom-blog__grid">{posts.map(item => (
              <article className="custom-blog__card" key={item.slug}>
                <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time>
                <h2><Link href={`${blog.config.basePath}/${item.slug}`}>{item.title}</Link></h2>
                <p>{item.excerpt}</p>
                <Link className="custom-blog__read" href={`${blog.config.basePath}/${item.slug}`}>Läs artikeln →</Link>
              </article>
            ))}</div> : <p>Inga publicerade artiklar ännu.</p>}
          </>
        )}
      </main>
  </CustomProjectFrame>;
}
