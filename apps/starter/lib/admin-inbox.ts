import {
  SubmissionKindSchema,
  inferSubmissionKind,
  type SubmissionKind,
} from "@staark/core";
import { resolvePublicContentConfig } from "./content-source";
import { requireAdminSiteKey } from "./admin-tenant";
import { createPostgresRepositories } from "./repositories";
import type {
  BookingStatus as RepositoryBookingStatus,
  RepositorySet,
  SubmissionRecord,
  SubmissionStatus,
} from "./repositories";
import {
  automationEventFromSubmission,
  runAutomationEvent,
} from "./automation-engine";

import {
  publishAdminRealtime,
} from "./admin-realtime";
import {
  readStateJson,
  readStateText,
  writeStateJson,
  writeStateText,
} from "./storage";

export type InboxStatus = SubmissionStatus;
export type BookingStatus = RepositoryBookingStatus;

export type InboxActivity = {
  at: string;
  actor: string;
  message: string;
};

export type InboxSubmission = {
  id: string;
  formId: string;
  kind: SubmissionKind;
  fields: Record<string, unknown>;
  pageUrl?: string;
  receivedAt: string;
  meta?: Record<string, string>;
  status: InboxStatus;
  bookingStatus?: BookingStatus;
  activity: InboxActivity[];
};

type InboxState = {
  status?: InboxStatus;
  bookingStatus?: BookingStatus;
  activity?: InboxActivity[];
};

type InboxStateFile = Record<string, InboxState>;

function submissionId(index: number): string {
  return `SFS-${String(index + 1).padStart(5, "0")}`;
}

/** CRM existed briefly in the starter admin. Keep old state readable without surfacing old noise. */
function visibleActivity(entry: InboxActivity): boolean {
  return !(
    /^Lead stage:/i.test(entry.message) ||
    /^Follow-up /i.test(entry.message) ||
    /^Internal note /i.test(entry.message)
  );
}

export function adminInboxUsesPostgres(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolvePublicContentConfig(env).source === "postgres";
}

async function requirePostgresSite(repositories: RepositorySet) {
  const key = await requireAdminSiteKey();
  const site = await repositories.sites.findByKey(key);
  if (!site) {
    throw new Error(`No PostgreSQL Site exists for resolved tenant "${key}".`);
  }
  return site;
}

function toInboxSubmission(record: SubmissionRecord): InboxSubmission {
  return {
    id: record.id,
    formId: record.formId,
    kind: record.kind,
    fields: record.fields,
    pageUrl: record.pageUrl,
    receivedAt: record.receivedAt,
    meta: record.meta,
    status: record.status,
    bookingStatus: record.bookingStatus,
    activity: record.activity.map((entry) => ({
      at: entry.at,
      actor: entry.actor,
      message: entry.message,
    })),
  };
}

async function readLegacyState(): Promise<InboxStateFile> {
  try {
    const parsed = await readStateJson<unknown>("inbox-state.json");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as InboxStateFile)
      : {};
  } catch {
    return {};
  }
}

async function writeLegacyState(state: InboxStateFile): Promise<void> {
  await writeStateJson("inbox-state.json", state);
}

async function listLegacyInboxSubmissions(): Promise<InboxSubmission[]> {
  let lines: string[] = [];

  try {
    const raw = await readStateText("submissions.jsonl");
    if (raw === null || !raw.trim()) return [];
    lines = raw.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }

  const state = await readLegacyState();
  const submissions: InboxSubmission[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    try {
      const raw = JSON.parse(lines[index]!) as {
        formId?: unknown;
        kind?: unknown;
        fields?: unknown;
        pageUrl?: unknown;
        receivedAt?: unknown;
        meta?: unknown;
      };

      const id = submissionId(index);
      const fields = raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)
        ? (raw.fields as Record<string, unknown>)
        : {};
      const formId = typeof raw.formId === "string" ? raw.formId : "form";
      const kindResult = SubmissionKindSchema.safeParse(raw.kind);
      const kind = kindResult.success ? kindResult.data : inferSubmissionKind(formId, fields);
      const receivedAt = typeof raw.receivedAt === "string"
        ? raw.receivedAt
        : new Date(0).toISOString();
      const saved = state[id] ?? {};
      const savedActivity = saved.activity?.filter(visibleActivity) ?? [];
      const activity = savedActivity.length
        ? savedActivity
        : [{ at: receivedAt, actor: "system", message: "Submission received" }];

      submissions.push({
        id,
        formId,
        kind,
        fields,
        pageUrl: typeof raw.pageUrl === "string" ? raw.pageUrl : undefined,
        receivedAt,
        meta:
          raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta)
            ? (raw.meta as Record<string, string>)
            : undefined,
        status: saved.status ?? "new",
        bookingStatus: kind === "booking" ? saved.bookingStatus ?? "pending" : undefined,
        activity,
      });
    } catch {
      // One malformed legacy line must not break the Inbox.
    }
  }

  return submissions.reverse();
}

export async function listInboxSubmissions(): Promise<InboxSubmission[]> {
  if (!adminInboxUsesPostgres()) return listLegacyInboxSubmissions();

  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  return (await repositories.submissions.list(site.id)).map(toInboxSubmission);
}

export async function getInboxSubmission(id: string): Promise<InboxSubmission | null> {
  if (!adminInboxUsesPostgres()) {
    return (await listLegacyInboxSubmissions()).find((item) => item.id === id) ?? null;
  }

  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  const record = await repositories.submissions.findById(site.id, id);
  return record ? toInboxSubmission(record) : null;
}

export async function updateInboxSubmission(
  id: string,
  patch: {
    status?: InboxStatus;
    bookingStatus?: BookingStatus;
    activityMessage?: string;
  },
): Promise<InboxSubmission | null> {
  if (!adminInboxUsesPostgres()) {
    const current = await getInboxSubmission(id);
    if (!current) return null;

    const state = await readLegacyState();
    const previous = state[id] ?? {};
    const activity = previous.activity?.filter(visibleActivity) ?? [];
    if (!activity.length) {
      activity.push({ at: current.receivedAt, actor: "system", message: "Submission received" });
    }

    if (patch.status && patch.status !== current.status) {
      activity.push({
        at: new Date().toISOString(),
        actor: "admin",
        message: `Status: ${current.status} → ${patch.status}`,
      });
    }
    if (patch.bookingStatus && patch.bookingStatus !== current.bookingStatus) {
      activity.push({
        at: new Date().toISOString(),
        actor: "admin",
        message: `Booking: ${current.bookingStatus ?? "pending"} → ${patch.bookingStatus}`,
      });
    }
    if (patch.activityMessage?.trim()) {
      activity.push({
        at: new Date().toISOString(),
        actor: "admin",
        message: patch.activityMessage.trim().slice(0, 500),
      });
    }

    state[id] = {
      ...(patch.status
        ? { status: patch.status }
        : previous.status
          ? { status: previous.status }
          : {}),
      ...(patch.bookingStatus
        ? { bookingStatus: patch.bookingStatus }
        : previous.bookingStatus
          ? { bookingStatus: previous.bookingStatus }
          : {}),
      activity,
    };
    await writeLegacyState(state);
    return getInboxSubmission(id);
  }

  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  const current = await repositories.submissions.findById(site.id, id);
  if (!current) return null;

  if (patch.bookingStatus && current.kind !== "booking") {
    throw new Error("Booking status can only be updated on booking submissions.");
  }

  const now = new Date().toISOString();
  const appendActivity: InboxActivity[] = [];
  if (patch.status && patch.status !== current.status) {
    appendActivity.push({
      at: now,
      actor: "admin",
      message: `Status: ${current.status} → ${patch.status}`,
    });
  }
  if (patch.bookingStatus && patch.bookingStatus !== current.bookingStatus) {
    appendActivity.push({
      at: now,
      actor: "admin",
      message: `Booking: ${current.bookingStatus ?? "pending"} → ${patch.bookingStatus}`,
    });
  }
  if (patch.activityMessage?.trim()) {
    appendActivity.push({
      at: now,
      actor: "admin",
      message: patch.activityMessage.trim().slice(0, 500),
    });
  }

  const updated = await repositories.submissions.update(site.id, id, {
    status: patch.status,
    bookingStatus: patch.bookingStatus,
    appendActivity,
  });

  if (!updated) {
    return null;
  }

  if (
    patch.status &&
    patch.status !== current.status
  ) {
    await publishAdminRealtime(
      site.id,
      "submission.status.changed",
      {
        submissionId:
          updated.id,
        from:
          current.status,
        to:
          updated.status,
      },
    );
  }

  if (
    patch.bookingStatus &&
    patch.bookingStatus !== current.bookingStatus
  ) {
    await publishAdminRealtime(
      site.id,
      "booking.status.changed",
      {
        submissionId:
          updated.id,
        from:
          current.bookingStatus ??
          "pending",
        to:
          updated.bookingStatus ??
          "pending",
      },
    );
  }

  try {
    if (
      patch.status &&
      patch.status !== current.status
    ) {
      await runAutomationEvent(
        automationEventFromSubmission(
          updated,
          {
            eventKey:
              `submission.status.changed:${updated.id}:${current.status}:${updated.status}:${updated.activity.length}`,
            eventType:
              "submission.status.changed",
            previousStatus:
              current.status,
          },
        ),
      );
    }

    if (
      patch.bookingStatus &&
      patch.bookingStatus !== current.bookingStatus
    ) {
      await runAutomationEvent(
        automationEventFromSubmission(
          updated,
          {
            eventKey:
              `booking.status.changed:${updated.id}:${current.bookingStatus ?? "pending"}:${updated.bookingStatus ?? "pending"}:${updated.activity.length}`,
            eventType:
              "booking.status.changed",
            previousBookingStatus:
              current.bookingStatus,
          },
        ),
      );
    }
  } catch (error) {
    // Inbox state changes remain authoritative even when an automation fails.
    console.error(
      "[automation] Status automation dispatch failed:",
      error instanceof Error
        ? error.message
        : String(error),
    );
  }

  return toInboxSubmission(
    updated,
  );
}

export async function clearInbox(): Promise<void> {
  if (!adminInboxUsesPostgres()) {
    await Promise.all([
      writeStateText("submissions.jsonl", ""),
      writeStateJson("inbox-state.json", {}),
    ]);
    return;
  }

  const repositories = createPostgresRepositories();
  const site = await requirePostgresSite(repositories);
  await repositories.submissions.clear(site.id);
}
