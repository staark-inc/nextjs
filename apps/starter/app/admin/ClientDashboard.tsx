import Link from "next/link";
import type { WebsiteType } from "@staark/core";
import type { DashboardData } from "@/lib/admin-dashboard";
import {
  plural,
  relativeTime,
} from "@/lib/dashboard-model";
import {
  resolveClientNavigation,
  resolveWebsiteProfile,
} from "@/lib/website-profile";
import AdminIcon from "./AdminIcon";
import Greeting from "./Greeting";
import NeedsYou from "./NeedsYou";
import styles from "./dashboard.module.css";

const ARROW = "M5 12h14 M13 6l6 6-6 6";

const ACTIVITY_ICONS: Record<string, string> = {
  inbox: "M4 4h16v16H4V4Zm0 3 8 6 8-6",
  enquiry: "M4 4h16v16H4V4Zm0 3 8 6 8-6",
  booking: "M4 6h16v14H4V6Zm0 4h16 M8 3v4 M16 3v4",
  page: "M4 20h4L19 9l-4-4L4 16v4Z",
  media: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm0 12 4.5-4.5 3 3 2-2 6.5 6.5",
};

function profileSubtitle(type: WebsiteType): string {
  if (type === "salon") {
    return "Appointments, messages and website updates in one place.";
  }

  if (type === "automotive") {
    return "Service requests, messages and website updates in one place.";
  }

  if (type === "restaurant") {
    return "Reservations, messages and website updates in one place.";
  }

  return "Messages and website updates in one place.";
}

export default function ClientDashboard({
  data,
  username,
  websiteType,
  bookingEnabled,
}: {
  data: DashboardData;
  username: string;
  websiteType: WebsiteType;
  bookingEnabled: boolean;
}) {
  const navigation = resolveClientNavigation(websiteType);
  const profile = resolveWebsiteProfile(websiteType);

  const tasks = data.tasks.filter((task) => {
    if (task.kind === "message") return true;
    if (task.kind === "booking") return bookingEnabled;
    return false;
  });

  const moreTasks = {
    messages: data.moreTasks.messages,
    bookings: bookingEnabled ? data.moreTasks.bookings : 0,
  };

  const newMessages =
    tasks.filter((task) => task.kind === "message").length +
    data.moreTasks.messages;

  const activity = data.activity.filter((event) => {
    if (
      /^Lead stage:/i.test(event.text) ||
      /^Follow-up /i.test(event.text) ||
      /^Internal note /i.test(event.text)
    ) {
      return false;
    }

    if (event.kind === "booking") return bookingEnabled;

    // Do not expose internal CRM / admin state changes to the client.
    return (
      event.kind === "enquiry" ||
      event.kind === "inbox" ||
      event.kind === "page" ||
      event.kind === "media"
    );
  });

  const summary = tasks.length
    ? `${plural(tasks.length, "thing")} need${
        tasks.length === 1 ? "s" : ""
      } your attention.`
    : "Everything looks good today.";

  return (
    <>
      <section className="sa-page-header">
        <div>
          <Greeting
            name={username}
            locale={data.locale}
            serverNow={data.now}
          />
          <p className="sa-subtitle">{summary}</p>
        </div>

        <div className="sa-page-header__actions">
          <Link
            className="sa-btn sa-btn--ghost"
            href="/admin/forms"
          >
            {navigation.inboxLabel}
          </Link>

          {bookingEnabled ? (
            <Link
              className="sa-btn sa-btn--primary"
              href="/admin/bookings"
            >
              {navigation.bookingLabel}
            </Link>
          ) : (
            <Link
              className="sa-btn sa-btn--primary"
              href="/admin/pages"
            >
              Edit website
            </Link>
          )}
        </div>
      </section>

      <section
        className={styles.stats}
        aria-label="Business at a glance"
      >
        <article className={styles.stat}>
          <span className={styles.statLabel}>New messages</span>
          <strong className={styles.statValue}>
            {newMessages}
          </strong>
          <span className={styles.statNote}>
            {newMessages
              ? "Waiting for you"
              : "Nothing new"}
          </span>
        </article>

        {bookingEnabled ? (
          <article className={styles.stat}>
            <span className={styles.statLabel}>
              {navigation.bookingLabel}
            </span>
            <strong className={styles.statValue}>
              {data.stats.bookings.pending}
            </strong>
            <span className={styles.statNote}>
              {data.stats.bookings.pending
                ? "Waiting for an answer"
                : `${data.stats.bookings.confirmed} confirmed`}
            </span>
          </article>
        ) : (
          <article className={styles.stat}>
            <span className={styles.statLabel}>
              Needs your attention
            </span>
            <strong className={styles.statValue}>
              {tasks.length}
            </strong>
            <span className={styles.statNote}>
              {tasks.length
                ? "Something needs a look"
                : "Everything is up to date"}
            </span>
          </article>
        )}

        <article className={styles.stat}>
          <span className={styles.statLabel}>Website pages</span>
          <strong className={styles.statValue}>
            {data.pages.length}
          </strong>
          <span className={styles.statNote}>
            Ready for you to edit
          </span>
        </article>

        <article className={styles.stat}>
          <span className={styles.statLabel}>Photos</span>
          <strong className={styles.statValue}>
            {data.stats.media.count}
          </strong>
          <span className={styles.statNote}>
            In your media library
          </span>
        </article>
      </section>

      <section className={`sa-card ${styles.overviewQuick}`}>
        <div className="sa-card__header sa-card__header--compact">
          <div>
            <span className="sa-card__eyebrow">
              Quick actions
            </span>
            <h2>What do you want to update?</h2>
          </div>
        </div>

        <nav
          className={styles.shortcuts}
          aria-label="Quick actions"
        >
          {bookingEnabled ? (
            <Link
              href="/admin/bookings"
              className={styles.shortcut}
            >
              <strong>{navigation.bookingLabel}</strong>
              <span>
                View and answer incoming requests
              </span>
            </Link>
          ) : (
            <Link
              href="/admin/forms"
              className={styles.shortcut}
            >
              <strong>{navigation.inboxLabel}</strong>
              <span>Read customer messages</span>
            </Link>
          )}

          <Link
            href="/admin/pages"
            className={styles.shortcut}
          >
            <strong>Edit website</strong>
            <span>Change text and page content</span>
          </Link>

          <Link
            href="/admin/media"
            className={styles.shortcut}
          >
            <strong>Upload photos</strong>
            <span>Add or replace website images</span>
          </Link>

          <Link
            href="/admin/site"
            className={styles.shortcut}
          >
            <strong>
              {data.quick.openingHours
                ? "Opening hours"
                : "Business details"}
            </strong>
            <span>
              {data.quick.openingHours ||
                "Phone, address and contact details"}
            </span>
          </Link>
        </nav>
      </section>

      <div className={styles.grid}>
        <div className={styles.column}>
          <NeedsYou
            tasks={tasks}
            moreTasks={moreTasks}
          />

          <section className="sa-card">
            <div className="sa-card__header">
              <div>
                <span className="sa-card__eyebrow">Activity</span>
                <h2>Recent updates</h2>
              </div>

              <Link href="/admin/forms">
                {navigation.inboxLabel}
                {" "}
                <AdminIcon d={ARROW} size={16} />
              </Link>
            </div>

            {activity.length ? (
              <ul className={styles.feed}>
                {activity.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={event.href ?? "/admin"}
                      className={styles.feedItem}
                    >
                      <span className={styles.feedIcon}>
                        <AdminIcon
                          d={
                            ACTIVITY_ICONS[event.kind] ??
                            "M4 4h16v16H4V4Zm0 3 8 6 8-6"
                          }
                          size={15}
                        />
                      </span>

                      <span className={styles.feedText}>
                        {event.text}
                      </span>

                      <time dateTime={event.at}>
                        {relativeTime(event.at, data.now)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>
                Messages, bookings and website updates
                will show up here.
              </p>
            )}
          </section>
        </div>

        <aside className={styles.column}>
          <section className="sa-card">
            <div className="sa-card__header">
              <div>
                <span className="sa-card__eyebrow">
                  Your website
                </span>
                <h2>{profile.label}</h2>
                <p className="sa-subtitle">
                  {profile.description}
                </p>
              </div>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                View site
                {" "}
                <AdminIcon d={ARROW} size={16} />
              </a>
            </div>

            <nav
              className={styles.shortcuts}
              aria-label="Website management"
            >
              <Link
                href="/admin/pages"
                className={styles.shortcut}
              >
                <strong>Pages</strong>
                <span>Text and website content</span>
              </Link>

              <Link
                href="/admin/media"
                className={styles.shortcut}
              >
                <strong>Photos</strong>
                <span>Images used on the website</span>
              </Link>

              <Link
                href="/admin/site"
                className={styles.shortcut}
              >
                <strong>Business details</strong>
                <span>
                  Contact details and opening hours
                </span>
              </Link>

              <Link
                href="/admin/themes"
                className={styles.shortcut}
              >
                <strong>Design</strong>
                <span>
                  Colors, typography and style
                </span>
              </Link>
            </nav>
          </section>
        </aside>
      </div>
    </>
  );
}
