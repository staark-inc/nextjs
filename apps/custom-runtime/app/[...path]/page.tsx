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
import { BlogArticle, ArticleImage } from "@/components/BlogArticle";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ path: string[] }> };

async function resolvePage(params: Props["params"]) {
  const { project, blog } = await loadCustomBlog();
  const segments = (await params).path;
  const route = resolveCustomBlogPath(project, segments);
  if (route.owns) {
    if (!blog || route.slug === null) return null;
    const post = route.slug ? await blog.get(route.slug) : null;
    if (route.slug && !post) return null;
    return { kind: "blog" as const, project, blog, post };
  }
  const page = await loadCustomPage(project, segments);
  if (!page) return null;
  return { kind: "page" as const, project, page };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await resolvePage(params);
  if (!result) return { title: "Sidan kunde inte hittas", robots: "noindex" };
  if (result.kind === "page") return customPageMetadata(result.page, await loadCustomSite(result.project));
  const site = await loadCustomSite(result.project);
  const post = result.post;
  const title = post?.seo?.title || post?.title || result.blog.config.title;
  const description = post?.seo?.description || post?.excerpt || result.blog.config.description;
  const url = new URL(result.blog.config.basePath + (post ? `/${post.slug}` : ""), site.url).href;
  const image = post?.seo?.image ?? post?.cover;
  return { title, description, alternates: { canonical: url }, robots: { index: !post?.seo?.noindex, follow: true },
    openGraph: { title, description, url, type: post ? "article" : "website", siteName: site.name,
      ...(post ? { publishedTime: post.publishedAt, modifiedTime: post.updatedAt } : {}),
      ...(image ? { images: [{ url: new URL(image.src, site.url).href, width: image.width, height: image.height, alt: image.alt }] } : {}) } };
}

export default async function CustomContentPage({ params }: Props) {
  const result = await resolvePage(params);
  if (!result) notFound();
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
          <BlogArticle post={post} basePath={blog.config.basePath} title={blog.config.title} />
        ) : (
          <>
            <div className="custom-blog__heading"><span className="custom-blog__eyebrow">{project.project.name}</span>
              <h1>{blog.config.title}</h1><p className="custom-blog__intro">{blog.config.description}</p>
            </div>
            {posts.length ? <div className="custom-blog__grid">{posts.map(item => (
              <article className="custom-blog__card" key={item.slug}>
                {item.cover && <Link href={`${blog.config.basePath}/${item.slug}`}><ArticleImage image={item.cover} /></Link>}
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
