import NewsMarkdown from "@/components/news/NewsMarkdown";
import { safeNewsUrl } from "@/lib/news-policy";
import {
  readAdminAnnouncements,
} from "@/lib/hub-announcements";

export const dynamic =
  "force-dynamic";

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function kindLabel(
  kind: string,
): string {
  if (kind === "improvement") return "Improvement";
  if (kind === "fix") return "Fix";
  if (kind === "feature") {
    return "New feature";
  }

  if (kind === "maintenance") {
    return "Maintenance";
  }

  if (kind === "security") {
    return "Security";
  }

  return "Announcement";
}

export default async function UpdatesPage() {
  const feed =
    await readAdminAnnouncements(
      50,
    );

  return (
    <>
      <section className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Staark
          </p>

          <h1 className="sa-h1">
            News & Updates
          </h1>

          <p className="sa-subtitle">
            New features, product improvements and important service announcements.
          </p>
        </div>
      </section>

      {!feed.available ? (
        <div className="sa-updates-unavailable">
          <strong>
            Updates are temporarily unavailable
          </strong>

          <span>
            Your website and admin panel are still working normally.
          </span>
        </div>
      ) : null}

      <div className="sa-updates-list">
        {feed.items.map(
          (item) => (
            <article
              key={item.id}
              className="sa-card sa-update-card"
            >
              {item.coverImageUrl && safeNewsUrl(item.coverImageUrl, true) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="news-cover" src={safeNewsUrl(item.coverImageUrl, true)} alt="" loading="lazy" referrerPolicy="no-referrer" />
              ) : null}
              <div className="sa-update-card__meta">
                {item.pinned ? <span className="sa-update-kind">Pinned</span> : null}
                <span
                  className={`sa-update-kind sa-update-kind--${item.kind}`}
                >
                  {kindLabel(
                    item.kind,
                  )}
                </span>

                <time
                  dateTime={
                    item.publishedAt
                  }
                >
                  {formatDate(
                    item.publishedAt,
                  )}
                </time>
              </div>

              <div className="sa-update-card__copy">
                <h2>
                  {item.title}
                </h2>

                <strong>
                  {item.summary}
                </strong>

                <NewsMarkdown body={item.body} format={item.bodyFormat} />
                {item.ctaLabel && item.ctaUrl && safeNewsUrl(item.ctaUrl) ? <a className="news-cta" href={safeNewsUrl(item.ctaUrl)} target={/^https?:/.test(safeNewsUrl(item.ctaUrl)) ? "_blank" : undefined} rel="noopener noreferrer">{item.ctaLabel} →</a> : null}
              </div>
            </article>
          ),
        )}

        {feed.available &&
        !feed.items.length ? (
          <section className="sa-card sa-updates-empty">
            <strong>
              No updates yet
            </strong>

            <span>
              Product news and service announcements will appear here.
            </span>
          </section>
        ) : null}
      </div>
    </>
  );
}
