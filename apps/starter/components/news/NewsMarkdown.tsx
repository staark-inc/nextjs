import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeNewsUrl } from "@/lib/news-policy";
import "./news-markdown.css";

export default function NewsMarkdown({
  body,
  format = "plain",
}: {
  body: string;
  format?: string;
}) {
  if (format !== "markdown")
    return <div className="news-markdown news-plain">{body}</div>;
  return (
    <div className="news-markdown">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        urlTransform={(url, key) => safeNewsUrl(url, key === "src")}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target={/^https?:/.test(href) ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt }) =>
            typeof src === "string" && src ? (
              // News assets are served by the Hub or a user-selected external host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{alt}</span>
            ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
