import { listInboxSubmissions, type InboxSubmission } from "@/lib/admin-inbox";
import { listMediaFiles } from "@/lib/admin-media";
import { listPageRevisions } from "@/lib/admin-revisions";
import { listBackupTimes } from "@/lib/admin-backups";
import { peekAdminShellStatus } from "@/lib/admin-shell-status";
import { readStudioTheme } from "@/lib/theme-studio";
import { contentStoragePath, listContent, readContentJson } from "@/lib/storage";
import {
  dailyCounts,
  describeInboxActivity,
  latestActivity,
  plural,
  seoIssues,
  seoScore,
  sortTasks,
  weekOverWeek,
  type ActivityEvent,
  type DashboardTask,
  type SeoIssue,
  type SeoPage,
} from "@/lib/dashboard-model";

type DashboardSite = {
  name?: string;
  locale?: string;
  theme?: {
    preset?: string;
    studio?: { id?: string; name?: string; sourceUpdatedAt?: string };
    overrides?: { colors?: { primary?: string; surface?: string; ink?: string } };
  };
};

export type DashboardPage = SeoPage & { updatedAt: string; score: number; issues: SeoIssue[] };

export type DashboardData = {
  siteName: string;
  locale: string;
  tasks: DashboardTask[];
  /** Tasks beyond the ones shown, e.g. older unread messages. */
  moreTasks: { messages: number; bookings: number };
  stats: {
    enquiries: { daily: number[]; current: number; previous: number; delta: number };
    bookings: { confirmed: number; declined: number; pending: number; total: number };
    search: { ready: number; indexed: number; needsWork: number };
    media: { count: number; missingAlt: number; bytes: number };
  };
  pages: DashboardPage[];
  activity: ActivityEvent[];
  design: {
    title: string;
    theme: string;
    preset: string;
    studioId: string;
    pending: boolean;
    colors: { primary: string; surface: string; ink: string };
  };
  deployment: {
    source: "hub" | "fixtures" | string;
    mode: "Production" | "Development";
    contentDir: string;
    lastBackupAt: string | null;
  };
  now: number;
};

const MAX_BOOKING_TASKS = 5;
const MAX_MESSAGE_TASKS = 5;

function fieldText(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  return typeof value === "string" ? value.trim() : "";
}

export function contactName(item: InboxSubmission): string {
  return fieldText(item.fields, "name") || fieldText(item.fields, "email") || "Someone";
}

function preview(item: InboxSubmission, max = 90): string {
  const text =
    fieldText(item.fields, "message") ||
    fieldText(item.fields, "subject") ||
    fieldText(item.fields, "booking_item") ||
    fieldText(item.fields, "booking_type") ||
    item.formId;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function bookingWhen(item: InboxSubmission): string {
  const date = fieldText(item.fields, "booking_date");
  const time = fieldText(item.fields, "booking_time");
  const what = fieldText(item.fields, "booking_item") || fieldText(item.fields, "booking_type");
  return [date && time ? `${date}, ${time}` : date || time, what].filter(Boolean).join(" · ");
}

async function loadPages(): Promise<DashboardPage[]> {
  const prefix = `${contentStoragePath("pages")}/`;
  const entries = (await listContent("pages"))
    .map((entry) => ({ entry, file: entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : "" }))
    .filter(({ file }) => Boolean(file) && !file.includes("/") && file.endsWith(".json"))
    .sort((a, b) => a.file.localeCompare(b.file));

  return Promise.all(
    entries.map(async ({ entry, file }) => {
      const fallbackPath = `/${file.replace(/\.json$/i, "")}`;
      let page: SeoPage & { updatedAt: string };
      try {
        const data = await readContentJson<Record<string, unknown>>(`pages/${file}`);
        if (!data) throw new Error("Page object is missing.");
        const seo =
          data.seo && typeof data.seo === "object" && !Array.isArray(data.seo) ? (data.seo as Record<string, unknown>) : {};
        page = {
          file,
          path: typeof data.path === "string" ? data.path : fallbackPath,
          title: typeof data.title === "string" ? data.title : file.replace(/\.json$/i, ""),
          seoTitle: typeof seo.title === "string" ? seo.title : "",
          seoDescription: typeof seo.description === "string" ? seo.description : "",
          noindex: seo.noindex === true,
          updatedAt:
            typeof data.updatedAt === "string" ? data.updatedAt : entry.mtime > 0 ? new Date(entry.mtime).toISOString() : "",
        };
      } catch {
        page = { file, path: fallbackPath, title: file.replace(/\.json$/i, ""), seoTitle: "", seoDescription: "", noindex: false, updatedAt: "" };
      }
      return { ...page, score: seoScore(page), issues: seoIssues(page) };
    }),
  );
}

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const now = Date.now();
  const site = await readContentJson<DashboardSite>("site.json");
  if (!site) throw new Error("Site settings not found in storage.");

  const [pages, inbox, media, backups, shell] = await Promise.all([
    loadPages(),
    safe(listInboxSubmissions, []),
    safe(listMediaFiles, []),
    safe(() => listBackupTimes(1), []),
    safe(peekAdminShellStatus, null),
  ]);

  const revisions = (
    await Promise.all(pages.map((page) => safe(() => listPageRevisions(page.file, { limit: 3 }), [])))
  ).flat();

  // ---- Design ----------------------------------------------------------
  const theme = process.env.STAARK_THEME?.trim() || "salong";
  const preset = site.theme?.preset ?? "default";
  const studio = site.theme?.studio && typeof site.theme.studio === "object" ? site.theme.studio : null;
  const studioId = typeof studio?.id === "string" && /^[a-z0-9-]+$/.test(studio.id) ? studio.id : "";
  const studioName = typeof studio?.name === "string" ? studio.name : "";
  let studioPending = false;
  if (studioId && studio?.sourceUpdatedAt) {
    const draft = await safe(() => readStudioTheme(studioId), null);
    studioPending = Boolean(draft && draft.updatedAt !== studio.sourceUpdatedAt);
  }

  // ---- Tasks -------------------------------------------------------------
  const tasks: DashboardTask[] = [];
  const pendingBookings = inbox
    .filter((item) => item.bookingStatus === "pending")
    .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
  pendingBookings.slice(0, MAX_BOOKING_TASKS).forEach((item, index) => {
    tasks.push({
      id: `booking:${item.id}`,
      kind: "booking",
      tone: "urgent",
      title: `${contactName(item)} wants to book`,
      detail: bookingWhen(item) || preview(item),
      href: `/admin/forms/${item.id}`,
      submissionId: item.id,
      submissionStatus: item.status,
      order: index,
    });
  });

  const newMessages = inbox
    .filter((item) => item.status === "new" && item.bookingStatus !== "pending")
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  newMessages.slice(0, MAX_MESSAGE_TASKS).forEach((item, index) => {
    tasks.push({
      id: `message:${item.id}`,
      kind: "message",
      tone: "lead",
      title: contactName(item),
      detail: preview(item),
      href: `/admin/forms/${item.id}`,
      submissionId: item.id,
      submissionStatus: item.status,
      order: index,
    });
  });

  if (shell && shell.health.status === "error") {
    tasks.push({
      id: "health",
      kind: "health",
      tone: "urgent",
      title: `${plural(shell.health.errors, "site error")} found`,
      detail: "Site Health found problems that can break pages for visitors.",
      href: "/admin/health",
      order: 0,
    });
  }

  const indexed = pages.filter((page) => !page.noindex);
  const seoNeedsWork = indexed.filter((page) => page.issues.length > 0);
  if (seoNeedsWork.length) {
    const missingTitles = seoNeedsWork.filter((page) => page.issues.includes("missing title")).length;
    tasks.push({
      id: "seo",
      kind: "seo",
      tone: "warning",
      title: `${plural(seoNeedsWork.length, "page")} not ready for search`,
      detail:
        missingTitles === seoNeedsWork.length
          ? `${seoNeedsWork.map((page) => page.title).slice(0, 3).join(", ")} ${missingTitles === 1 ? "has" : "have"} no SEO title.`
          : "Titles or descriptions are missing or the wrong length.",
      href: "/admin/seo",
      order: 0,
    });
  }

  const missingAlt = media.filter((file) => !file.alt.trim());
  if (missingAlt.length) {
    tasks.push({
      id: "media",
      kind: "media",
      tone: "warning",
      title: `${plural(missingAlt.length, "image")} without alt text`,
      detail: `${missingAlt.slice(0, 2).map((file) => file.name).join(", ")}${missingAlt.length > 2 ? ` and ${missingAlt.length - 2} more` : ""}`,
      href: "/admin/media",
      order: 0,
    });
  }

  if (studioPending) {
    tasks.push({
      id: "design",
      kind: "design",
      tone: "design",
      title: `“${studioName || studioId}” has unpublished design changes`,
      detail: "The Theme Studio draft is newer than the design on the live site.",
      href: `/admin/themes/studio/${studioId}`,
      order: 0,
    });
  }

  // ---- Stats -------------------------------------------------------------
  const enquiryDaily = dailyCounts(inbox.map((item) => item.receivedAt), 14, now);
  const bookings = inbox.filter((item) => item.bookingStatus);

  // ---- Activity ----------------------------------------------------------
  const pageTitle = new Map(pages.map((page) => [page.file, page.title]));
  const events: ActivityEvent[] = [];
  for (const item of inbox.slice(0, 20)) {
    const name = contactName(item);
    events.push({
      id: `received:${item.id}`,
      at: item.receivedAt,
      kind: item.bookingStatus ? "booking" : "enquiry",
      text: item.bookingStatus ? `Booking request from ${name}` : `New enquiry from ${name}`,
      href: `/admin/forms/${item.id}`,
    });
    for (const [index, entry] of item.activity.entries()) {
      if (entry.actor !== "admin") continue;
      const text = describeInboxActivity(name, entry.message, Boolean(item.bookingStatus));
      if (!text) continue;
      events.push({
        id: `inbox:${item.id}:${index}`,
        at: entry.at,
        kind: "inbox",
        text,
        href: `/admin/forms/${item.id}`,
      });
    }
  }
  for (const revision of revisions) {
    const title = pageTitle.get(revision.file) ?? revision.title;
    const verb = revision.reason === "before-restore" ? "restored" : revision.reason === "before-delete" ? "deleted" : "edited";
    events.push({
      id: `revision:${revision.file}:${revision.id}`,
      at: revision.createdAt,
      kind: "page",
      text: `Page “${title}” ${verb}`,
      href: `/admin/pages/${encodeURIComponent(revision.file)}/revisions`,
    });
  }
  for (const backup of backups) {
    events.push({ id: `backup:${backup.id}`, at: backup.createdAt, kind: "backup", text: "Backup created", href: "/admin/backups" });
  }
  // Group uploads per day so a batch shows as one line.
  const uploadsByDay = new Map<string, string[]>();
  for (const file of media) {
    if (!file.modifiedAt) continue;
    const day = file.modifiedAt.slice(0, 10);
    uploadsByDay.set(day, [...(uploadsByDay.get(day) ?? []), file.modifiedAt]);
  }
  for (const [day, times] of uploadsByDay) {
    events.push({
      id: `media:${day}`,
      at: times.sort().at(-1)!,
      kind: "media",
      text: `${plural(times.length, "image")} added to Media`,
      href: "/admin/media",
    });
  }

  const source =
    process.env.STAARK_CONTENT_SOURCE?.trim() ||
    (process.env.STAARK_SITE_ID?.trim() && process.env.STAARK_SITE_SECRET?.trim() ? "hub" : "fixtures");

  return {
    siteName: site.name?.trim() || "Your website",
    locale: site.locale || "en-GB",
    tasks: sortTasks(tasks),
    moreTasks: {
      messages: Math.max(0, newMessages.length - MAX_MESSAGE_TASKS),
      bookings: Math.max(0, pendingBookings.length - MAX_BOOKING_TASKS),
    },
    stats: {
      enquiries: { daily: enquiryDaily, ...weekOverWeek(enquiryDaily) },
      bookings: {
        confirmed: bookings.filter((item) => item.bookingStatus === "confirmed").length,
        declined: bookings.filter((item) => item.bookingStatus === "declined").length,
        pending: pendingBookings.length,
        total: bookings.length,
      },
      search: { ready: indexed.length - seoNeedsWork.length, indexed: indexed.length, needsWork: seoNeedsWork.length },
      media: { count: media.length, missingAlt: missingAlt.length, bytes: media.reduce((sum, file) => sum + file.size, 0) },
    },
    pages: [...indexed].sort((a, b) => a.score - b.score || a.title.localeCompare(b.title)),
    activity: latestActivity(events, 8),
    design: {
      title: studioName || `${theme} / ${preset}`,
      theme,
      preset,
      studioId,
      pending: studioPending,
      colors: {
        primary: site.theme?.overrides?.colors?.primary ?? "#2563eb",
        surface: site.theme?.overrides?.colors?.surface ?? "#f1f5f9",
        ink: site.theme?.overrides?.colors?.ink ?? "#0f172a",
      },
    },
    deployment: {
      source,
      mode: process.env.NODE_ENV === "production" ? "Production" : "Development",
      contentDir: process.env.STAARK_CONTENT_DIR ?? "content",
      lastBackupAt: backups[0]?.createdAt ?? null,
    },
    now,
  };
}
