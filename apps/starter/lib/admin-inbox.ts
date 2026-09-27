import {
  readStateJson,
  readStateText,
  writeStateJson,
  writeStateText,
} from "./storage";

export type InboxStatus = "new" | "read" | "replied" | "archived";
export type BookingStatus = "pending" | "confirmed" | "declined";

export type InboxActivity = {
  at: string;
  actor: string;
  message: string;
};

export type InboxSubmission = {
  id: string;
  formId: string;
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

function isBooking(fields: Record<string, unknown>, formId: string): boolean {
  return (
    formId.toLowerCase().includes("booking") ||
    "booking_date" in fields ||
    "booking_time" in fields ||
    "booking_type" in fields ||
    "booking_item" in fields
  );
}

async function readState(): Promise<InboxStateFile> {
  try {
    const parsed = await readStateJson<unknown>("inbox-state.json");
    return parsed && typeof parsed === "object" ? (parsed as InboxStateFile) : {};
  } catch {
    return {};
  }
}

async function writeState(state: InboxStateFile): Promise<void> {
  await writeStateJson("inbox-state.json", state);
}

export async function listInboxSubmissions(): Promise<InboxSubmission[]> {
  let lines: string[] = [];
  try {
    const raw = await readStateText("submissions.jsonl");
    if (raw === null) return [];
    lines = raw.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }

  const state = await readState();
  const submissions: InboxSubmission[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    try {
      const raw = JSON.parse(lines[index]!) as {
        formId?: unknown;
        fields?: unknown;
        pageUrl?: unknown;
        receivedAt?: unknown;
        meta?: unknown;
      };
      const id = submissionId(index);
      const fields = raw.fields && typeof raw.fields === "object" ? (raw.fields as Record<string, unknown>) : {};
      const formId = typeof raw.formId === "string" ? raw.formId : "form";
      const receivedAt = typeof raw.receivedAt === "string" ? raw.receivedAt : new Date(0).toISOString();
      const saved = state[id] ?? {};
      const activity = saved.activity?.length
        ? saved.activity
        : [{ at: receivedAt, actor: "system", message: "Submission received" }];

      submissions.push({
        id,
        formId,
        fields,
        pageUrl: typeof raw.pageUrl === "string" ? raw.pageUrl : undefined,
        receivedAt,
        meta: raw.meta && typeof raw.meta === "object" ? (raw.meta as Record<string, string>) : undefined,
        status: saved.status ?? "new",
        bookingStatus: isBooking(fields, formId) ? (saved.bookingStatus ?? "pending") : undefined,
        activity,
      });
    } catch {
      // Skip malformed local fixture lines instead of breaking the whole inbox.
    }
  }

  return submissions.reverse();
}

export async function getInboxSubmission(id: string): Promise<InboxSubmission | null> {
  return (await listInboxSubmissions()).find((item) => item.id === id) ?? null;
}

export async function updateInboxSubmission(
  id: string,
  patch: { status?: InboxStatus; bookingStatus?: BookingStatus; activityMessage?: string },
): Promise<InboxSubmission | null> {
  const current = await getInboxSubmission(id);
  if (!current) return null;

  const state = await readState();
  const previous = state[id] ?? {};
  const activity = previous.activity?.length
    ? [...previous.activity]
    : [{ at: current.receivedAt, actor: "system", message: "Submission received" }];

  if (patch.status && patch.status !== current.status) {
    activity.push({ at: new Date().toISOString(), actor: "admin", message: `Status: ${current.status} → ${patch.status}` });
  }
  if (patch.bookingStatus && patch.bookingStatus !== current.bookingStatus) {
    activity.push({ at: new Date().toISOString(), actor: "admin", message: `Booking: ${current.bookingStatus ?? "pending"} → ${patch.bookingStatus}` });
  }
  if (patch.activityMessage?.trim()) {
    activity.push({ at: new Date().toISOString(), actor: "admin", message: patch.activityMessage.trim().slice(0, 500) });
  }

  state[id] = {
    ...previous,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.bookingStatus ? { bookingStatus: patch.bookingStatus } : {}),
    activity,
  };
  await writeState(state);
  return getInboxSubmission(id);
}

export async function clearInbox(): Promise<void> {
  await Promise.all([
    writeStateText("submissions.jsonl", ""),
    writeStateJson("inbox-state.json", {}),
  ]);
}
