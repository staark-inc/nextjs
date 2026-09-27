/**
 * Pure dashboard logic: no storage, no Next.js. Kept separate so it can be
 * unit tested with node --test.
 */

export type SeoPage = {
  file: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
};

export type SeoIssue = "missing title" | "missing description" | "description too short" | "description too long";

export function seoIssues(page: SeoPage): SeoIssue[] {
  if (page.noindex) return [];
  const issues: SeoIssue[] = [];
  const description = page.seoDescription.trim();
  if (!page.seoTitle.trim()) issues.push("missing title");
  if (!description) issues.push("missing description");
  else if (description.length < 50) issues.push("description too short");
  else if (description.length > 160) issues.push("description too long");
  return issues;
}

/** 0-100: half for the title, half for a description of useful length. */
export function seoScore(page: SeoPage): number {
  const issues = seoIssues(page);
  let score = 100;
  if (issues.includes("missing title")) score -= 50;
  if (issues.includes("missing description")) score -= 50;
  else if (issues.includes("description too short") || issues.includes("description too long")) score -= 20;
  return score;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(time: number): number {
  const d = new Date(time);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Count timestamps per UTC day for the last `days` days, oldest first.
 * The last bucket is today.
 */
export function dailyCounts(timestamps: string[], days: number, now: number): number[] {
  const counts = new Array<number>(days).fill(0);
  const today = startOfUtcDay(now);
  for (const value of timestamps) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    const offset = Math.round((today - startOfUtcDay(time)) / DAY_MS);
    if (offset < 0 || offset >= days) continue;
    counts[days - 1 - offset]! += 1;
  }
  return counts;
}

/** Sum of the last 7 buckets and the 7 before them. Expects 14 buckets. */
export function weekOverWeek(counts: number[]): { current: number; previous: number; delta: number } {
  const current = counts.slice(-7).reduce((sum, n) => sum + n, 0);
  const previous = counts.slice(-14, -7).reduce((sum, n) => sum + n, 0);
  return { current, previous, delta: current - previous };
}

export function relativeTime(iso: string, now: number, locale = "en-GB"): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((now - time) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor((startOfUtcDay(now) - startOfUtcDay(time)) / DAY_MS);
  if (days <= 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(time));
}

export type TaskTone = "urgent" | "lead" | "warning" | "design";

export type DashboardTask = {
  id: string;
  kind: "booking" | "message" | "health" | "seo" | "media" | "design";
  tone: TaskTone;
  title: string;
  detail: string;
  href: string;
  /** Inbox submission id for inline actions. */
  submissionId?: string;
  /** Current inbox status, needed to undo inline actions. */
  submissionStatus?: string;
  /** Sort key within a kind: lower comes first. */
  order: number;
};

const KIND_PRIORITY: Record<DashboardTask["kind"], number> = {
  booking: 0,
  health: 1,
  message: 2,
  seo: 3,
  media: 4,
  design: 5,
};

/** Bookings first, then site errors, new messages, SEO, media, design. */
export function sortTasks(tasks: DashboardTask[]): DashboardTask[] {
  return [...tasks].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || a.order - b.order);
}

export type ActivityEvent = {
  id: string;
  at: string;
  kind: "enquiry" | "booking" | "inbox" | "page" | "backup" | "media";
  text: string;
  href?: string;
};

export function latestActivity(events: ActivityEvent[], limit: number): ActivityEvent[] {
  return events
    .filter((event) => !Number.isNaN(Date.parse(event.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Turn an inbox activity entry ("Booking: pending → confirmed") into a line
 * for the activity feed. Returns null for entries that add nothing on their
 * own, such as the automatic "new → read" that comes with a booking answer.
 */
export function describeInboxActivity(name: string, message: string, isBooking: boolean): string | null {
  const booking = /^Booking: \w+ → (confirmed|declined|pending)$/.exec(message);
  if (booking) {
    const to = booking[1];
    if (to === "pending") return `Booking from ${name} moved back to pending`;
    return `Booking from ${name} ${to}`;
  }
  const status = /^Status: \w+ → (new|read|replied|archived)$/.exec(message);
  if (status) {
    if (isBooking) return null;
    const to = status[1];
    if (to === "read") return `Message from ${name} marked as read`;
    if (to === "new") return `Message from ${name} marked as unread`;
    if (to === "replied") return `Replied to ${name}`;
    return `Message from ${name} archived`;
  }
  return `${name}: ${message}`;
}
