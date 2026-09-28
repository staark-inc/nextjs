import Link from "next/link";
import { loadDashboard } from "@/lib/admin-dashboard";
import { plural, relativeTime, type ActivityEvent } from "@/lib/dashboard-model";
import { getSession } from "@/lib/auth";
import AdminIcon from "./AdminIcon";
import Greeting from "./Greeting";
import NeedsYou from "./NeedsYou";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const ARROW = "M5 12h14 M13 6l6 6-6 6";

const ACTIVITY_ICONS: Record<ActivityEvent["kind"], string> = {
  enquiry: "M4 4h16v16H4V4Zm0 3 8 6 8-6",
  booking: "M4 6h16v14H4V6Zm0 4h16 M8 3v4 M16 3v4",
  inbox: "M20 6 9 17l-5-5",
  page: "M4 20h4L19 9l-4-4L4 16v4Z",
  backup: "M12 3a9 9 0 1 1-8.49 6 M3 4v5h5 M12 7v5l3 2",
  media: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm0 12 4.5-4.5 3 3 2-2 6.5 6.5",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DailyBars({
  values,
  label,
  unit,
  tone = "primary",
}: {
  values: number[];
  label: string;
  unit: [string, string];
  tone?: "primary" | "success";
}) {
  const width = 140;
  const height = 34;
  const gap = 2;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const max = Math.max(1, ...values);
  const labels = values.map((_, index) => {
    const daysAgo = values.length - 1 - index;
    return daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
  });

  return (
    <svg className={styles.bars} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none">
      <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} className={styles.barsBaseline} />
      {values.map((value, index) => {
        const h = value === 0 ? 0 : Math.max(3, (value / max) * (height - 4));
        const x = index * (barWidth + gap);
        const isToday = index === values.length - 1;
        return (
          <g key={index}>
            {/* Full-height invisible hit area so each day is easy to hover. */}
            <rect x={x} y={0} width={barWidth} height={height} fill="transparent">
              <title>{`${labels[index]}: ${plural(value, unit[0], unit[1])}`}</title>
            </rect>
            {h > 0 ? (
              <rect
                x={x}
                y={height - 1 - h}
                width={barWidth}
                height={h}
                rx={Math.min(2, barWidth / 2)}
                className={`${isToday ? styles.barToday : styles.bar} ${tone === "success" ? styles.barSuccess : ""}`}
                pointerEvents="none"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? value / max : 0;
  const tone = max === 0 || ratio >= 1 ? styles.meterGood : styles.meterWarn;
  return (
    <div className={styles.meter} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span className={tone} style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}

function seoChip(issues: string[]): { label: string; className: string | undefined } {
  if (!issues.length) return { label: "Ready", className: styles.chipGood };
  if (issues.includes("missing title")) return { label: "No title", className: styles.chipWarn };
  if (issues.includes("missing description")) return { label: "No description", className: styles.chipWarn };
  if (issues.includes("description too short")) return { label: "Short description", className: styles.chipWarn };
  return { label: "Long description", className: styles.chipWarn };
}

export default async function AdminDashboard() {
  const [data, session] = await Promise.all([loadDashboard(), getSession()]);
  const { stats, tasks, now } = data;
  const firstKind = tasks[0]?.kind;

  const summary = tasks.length
    ? `${plural(tasks.length, "thing")} need${tasks.length === 1 ? "s" : ""} you.${
        firstKind === "booking" ? " Bookings first." : firstKind === "health" ? " Site errors first." : ""
      }`
    : "Nothing needs you right now.";

  const delta = stats.enquiries.delta;
  const deltaText =
    stats.enquiries.current === 0 && stats.enquiries.previous === 0
      ? "None in the last 14 days"
      : delta === 0
        ? "Same as the week before"
        : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} ${delta > 0 ? "more" : "fewer"} than the week before`;

  return (
    <>
      <section className="sa-page-header">
        <div>
          <Greeting name={session.username ?? "admin"} locale={data.locale} serverNow={now} />
          <p className="sa-subtitle">{summary}</p>
        </div>
        <div className="sa-page-header__actions">
          <Link className="sa-btn sa-btn--ghost" href="/admin/pages">
            <AdminIcon d="M4 20h4L19 9l-4-4L4 16v4Z" size={15} /> Edit a page
          </Link>
          <Link className="sa-btn sa-btn--primary" href="/admin/forms">Open inbox</Link>
        </div>
      </section>

      <section className={styles.stats} aria-label="Website at a glance">
        <article className={styles.stat}>
          <span className={styles.statLabel}>Enquiries · last 7 days</span>
          <strong className={styles.statValue}>{stats.enquiries.current}</strong>
          <span className={styles.statNote}>{deltaText}</span>
          <DailyBars values={stats.enquiries.daily} label="Enquiries per day, last 14 days" unit={["enquiry", "enquiries"]} />
        </article>

        <article className={styles.stat}>
          <span className={styles.statLabel}>Bookings confirmed</span>
          <strong className={styles.statValue}>
            {stats.bookings.confirmed}
            <small> / {stats.bookings.total}</small>
          </strong>
          <span className={styles.statNote}>
            {stats.bookings.total
              ? stats.bookings.pending
                ? `${stats.bookings.pending} waiting on you`
                : "Every request has an answer"
              : "No booking requests yet"}
          </span>
          <DailyBars
            values={stats.bookings.daily}
            label="Booking requests per day, last 14 days"
            unit={["booking request", "booking requests"]}
            tone="success"
          />
        </article>

        <article className={styles.stat}>
          <span className={styles.statLabel}>Ready for search</span>
          <strong className={styles.statValue}>
            {stats.search.ready}
            <small> / {stats.search.indexed}</small>
          </strong>
          <span className={styles.statNote}>
            {stats.search.needsWork ? `${plural(stats.search.needsWork, "page")} need a title or description` : "All indexed pages are ready"}
          </span>
          <Meter value={stats.search.ready} max={stats.search.indexed} label="Pages ready for search" />
        </article>

        <article className={styles.stat}>
          <span className={styles.statLabel}>Media</span>
          <strong className={styles.statValue}>
            {stats.media.count}
            <small> {stats.media.count === 1 ? "file" : "files"}</small>
          </strong>
          <span className={styles.statNote}>
            {stats.media.missingAlt ? `${stats.media.missingAlt} without alt text` : "All have alt text"} · {formatBytes(stats.media.bytes)}
          </span>
          <Meter value={stats.media.count - stats.media.missingAlt} max={stats.media.count} label="Images with alt text" />
        </article>
      </section>

      <div className={styles.grid}>
        <div className={styles.column}>
          <NeedsYou tasks={tasks} moreTasks={data.moreTasks} />

          <section className="sa-card">
            <div className="sa-card__header">
              <div>
                <span className="sa-card__eyebrow">History</span>
                <h2>Recent activity</h2>
              </div>
              <Link href="/admin/backups">Backups <AdminIcon d={ARROW} size={16} /></Link>
            </div>
            {data.activity.length ? (
              <ul className={styles.feed}>
                {data.activity.map((event) => (
                  <li key={event.id}>
                    <Link href={event.href ?? "/admin"} className={styles.feedItem}>
                      <span className={styles.feedIcon}><AdminIcon d={ACTIVITY_ICONS[event.kind]} size={15} /></span>
                      <span className={styles.feedText}>{event.text}</span>
                      <time dateTime={event.at}>{relativeTime(event.at, now)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>Edits, enquiries, uploads and backups will show up here.</p>
            )}
          </section>
        </div>

        <aside className={styles.column}>
          <section className="sa-card">
            <div className="sa-card__header">
              <div>
                <span className="sa-card__eyebrow">Search</span>
                <h2>Search readiness</h2>
              </div>
              <Link href="/admin/seo">Open SEO <AdminIcon d={ARROW} size={16} /></Link>
            </div>
            {data.pages.length ? (
              <ul className={styles.seoList}>
                {data.pages.slice(0, 6).map((page) => {
                  const chip = seoChip(page.issues);
                  return (
                    <li key={page.file}>
                      <Link href={`/admin/pages/${encodeURIComponent(page.file)}`} className={styles.seoRow}>
                        <span className={styles.seoName}>
                          <strong>{page.title}</strong>
                          <code>{page.path}</code>
                        </span>
                        <span className={chip.className}>{chip.label}</span>
                      </Link>
                      <Meter value={page.score} max={100} label={`${page.title}: search readiness ${page.score}%`} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyNote}>No indexed pages yet.</p>
            )}
            {data.pages.length > 6 ? (
              <p className={styles.moreNote}>
                <Link href="/admin/seo">{plural(data.pages.length - 6, "more page")} in SEO</Link>
              </p>
            ) : null}
          </section>

          <section className="sa-card">
            <div className="sa-card__header sa-card__header--compact">
              <div>
                <span className="sa-card__eyebrow">Create</span>
                <h2>Quick actions</h2>
              </div>
            </div>
            <nav className={styles.shortcuts} aria-label="Quick actions">
              {data.quick.home ? (
                <Link href={`/admin/pages/${encodeURIComponent(data.quick.home.file)}`} className={styles.shortcut}>
                  <strong>Edit {data.quick.home.title}</strong>
                  <span>{data.quick.home.blocks.length ? data.quick.home.blocks.slice(0, 3).join(", ") : "Home page"}</span>
                </Link>
              ) : (
                <Link href="/admin/pages" className={styles.shortcut}>
                  <strong>New page</strong>
                  <span>Start from a template</span>
                </Link>
              )}
              <Link href="/admin/media" className={styles.shortcut}>
                <strong>Upload images</strong>
                <span>JPG, PNG, WebP</span>
              </Link>
              <Link href="/admin/navigation" className={styles.shortcut}>
                <strong>Change menu</strong>
                <span>
                  {plural(data.quick.menu.links, "link")}
                  {data.quick.menu.cta ? " + button" : ""}
                </span>
              </Link>
              <Link href="/admin/site" className={styles.shortcut}>
                <strong>{data.quick.openingHours ? "Opening hours" : "Business details"}</strong>
                <span>{data.quick.openingHours || "Contact info and address"}</span>
              </Link>
            </nav>
          </section>

          <section className="sa-card sa-overview-design">
            <div className="sa-overview-design__top">
              <div>
                <span className="sa-card__eyebrow">Active design</span>
                <h2>{data.design.title}</h2>
              </div>
              <span className={`sa-badge ${data.design.pending ? "sa-badge--muted" : "sa-badge--success"}`}>
                {data.design.pending ? "Updates pending" : data.design.studioId ? "Applied" : "Built-in"}
              </span>
            </div>
            <div className="sa-overview-design__preview">
              <span style={{ background: data.design.colors.primary }} />
              <span style={{ background: data.design.colors.surface }} />
              <span style={{ background: data.design.colors.ink }} />
            </div>
            <Link
              className="sa-btn sa-btn--ghost"
              href={data.design.studioId ? `/admin/themes/studio/${data.design.studioId}` : "/admin/themes/studio"}
            >
              Open Theme Studio
            </Link>
          </section>

          <section className="sa-card">
            <div className="sa-card__header sa-card__header--compact">
              <div>
                <span className="sa-card__eyebrow">System</span>
                <h2>Deployment</h2>
              </div>
              <Link href="/admin/health">Site Health <AdminIcon d={ARROW} size={16} /></Link>
            </div>
            <dl className={styles.deploy}>
              <dt>Theme</dt>
              <dd>{data.design.theme} · {data.design.preset}</dd>
              <dt>Content</dt>
              <dd>{data.deployment.source === "hub" ? "Staark Hub" : data.deployment.source === "fixtures" ? "Local files" : data.deployment.source}</dd>
              <dt>Mode</dt>
              <dd>{data.deployment.mode}</dd>
              <dt>Last backup</dt>
              <dd>{data.deployment.lastBackupAt ? relativeTime(data.deployment.lastBackupAt, now) : "None yet"}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
