import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { matchBlogPath } from "@staark/addon-blog/config";
import { loadCustomBlog } from "@/lib/custom-blog";
import { loadCustomSite } from "@/lib/custom-content";
import { CustomProjectFrame } from "@/lib/custom-frame";
import "./blog.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ path: string[] }> };

async function resolveBlogPage(params: Props["params"]) {
  const { project, blog } = await loadCustomBlog();
  if (!blog) notFound();
  const slug = matchBlogPath(blog.config.basePath, (await params).path);
  if (slug === null) notFound();
  const post = slug ? await blog.get(slug) : null;
  if (slug && !post) notFound();
  return { project, blog, post };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { blog, post } = await resolveBlogPage(params);
  return { title: post?.title ?? blog.config.title, description: post?.excerpt ?? blog.config.description };
}

export default async function BlogPage({ params }: Props) {
  const { project, blog, post } = await resolveBlogPage(params);
  const posts = post ? [] : await blog.list();
  const site = await loadCustomSite(project);
  return <CustomProjectFrame project={project} site={site}>
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
