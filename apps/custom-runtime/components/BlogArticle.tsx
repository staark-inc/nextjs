import Link from "next/link";
import { blogPostBody, type EditableBlogPost, type BlogImage } from "@staark/addon-blog/content";
export function ArticleImage({ image }: { image: BlogImage }) {
  return <figure className="custom-blog__image"><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>;
}
export function BlogArticle({ post, basePath, title }: { post: Omit<EditableBlogPost, "status">; basePath: string; title: string }) {
  return <article className="custom-blog__article">
    <Link className="custom-blog__back" href={basePath}>← {title}</Link>
    {post.publishedAt && <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10)}</time>}
    <h1>{post.title}</h1><p className="custom-blog__intro">{post.excerpt}</p>
    {post.cover && <ArticleImage image={post.cover} />}
    <div className="custom-blog__body">{blogPostBody(post).map((block, index) => {
      switch (block.type) {
        case "paragraph": return <p key={index}>{block.text}</p>;
        case "heading": return <h2 key={index}>{block.text}</h2>;
        case "list": return block.ordered ? <ol key={index}>{block.items.map((item, at) => <li key={at}>{item}</li>)}</ol> : <ul key={index}>{block.items.map((item, at) => <li key={at}>{item}</li>)}</ul>;
        case "link": return <p key={index}><a href={block.href}>{block.label}</a></p>;
        case "image": return <ArticleImage key={index} image={block.image} />;
      }
    })}</div>
  </article>;
}
