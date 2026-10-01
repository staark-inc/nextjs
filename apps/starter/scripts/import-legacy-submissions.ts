import {
  SubmissionKindSchema,
  inferSubmissionKind,
  type SubmissionKind,
} from "@staark/core";
import { getStorage, readJson } from "@staark/core/storage";

import { disconnectPrismaClient } from "../lib/db/prisma";
import {
  createPostgresRepositories,
  withPostgresTransaction,
  type BookingStatus,
  type CreateSubmissionInput,
  type SubmissionStatus,
} from "../lib/repositories";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const write = process.argv.includes("--write");
const siteKey = (arg("--site-key") ?? process.env.STAARK_SITE_KEY ?? "")
  .trim()
  .toLowerCase();

if (!siteKey) {
  throw new Error("Pass --site-key <key> or set STAARK_SITE_KEY.");
}

type LegacyActivity = { at?: unknown; actor?: unknown; message?: unknown };
type LegacyState = {
  status?: unknown;
  bookingStatus?: unknown;
  activity?: unknown;
};
type LegacyStateFile = Record<string, LegacyState>;

function submissionId(index: number): string {
  return `SFS-${String(index + 1).padStart(5, "0")}`;
}

function visibleActivity(message: string): boolean {
  return !(
    /^Lead stage:/i.test(message) ||
    /^Follow-up /i.test(message) ||
    /^Internal note /i.test(message)
  );
}

function status(value: unknown): SubmissionStatus {
  return value === "read" || value === "replied" || value === "archived" ? value : "new";
}

function bookingStatus(value: unknown): BookingStatus {
  return value === "confirmed" || value === "declined" ? value : "pending";
}

function stringMeta(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") out[key] = item;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseActivity(value: unknown, receivedAt: string) {
  const out: Array<{ at: string; actor: string; message: string }> = [];
  if (Array.isArray(value)) {
    for (const raw of value as LegacyActivity[]) {
      const message = typeof raw?.message === "string" ? raw.message.trim().slice(0, 500) : "";
      if (!message || !visibleActivity(message)) continue;
      const at = typeof raw.at === "string" && !Number.isNaN(Date.parse(raw.at))
        ? raw.at
        : receivedAt;
      const actor = typeof raw.actor === "string" && raw.actor.trim()
        ? raw.actor.trim().slice(0, 80)
        : "system";
      out.push({ at, actor, message });
    }
  }
  return out.length
    ? out
    : [{ at: receivedAt, actor: "system", message: "Submission received" }];
}

function comparable(input: CreateSubmissionInput) {
  return {
    formId: input.formId,
    kind: input.kind,
    fields: input.fields,
    pageUrl: input.pageUrl ?? null,
    meta: input.meta ?? {},
    status: input.status,
    bookingStatus: input.bookingStatus ?? null,
    receivedAt: input.receivedAt,
    activity: input.activity ?? [],
  };
}

async function main() {
  const storage = getStorage();
  const rawText = (await storage.readText(".staark/submissions.jsonl")) ?? "";
  let state: LegacyStateFile = {};
  try {
    state = (await readJson<LegacyStateFile>(storage, ".staark/inbox-state.json")) ?? {};
  } catch (error) {
    console.warn(
      `[staark] Could not read legacy inbox-state.json; importing submissions with default state: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const lines = rawText.trim() ? rawText.trim().split("\n") : [];
  const legacy: CreateSubmissionInput[] = [];
  let malformed = 0;

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
      const formId = typeof raw.formId === "string" && raw.formId.trim()
        ? raw.formId.trim().slice(0, 64)
        : "form";
      const kindResult = SubmissionKindSchema.safeParse(raw.kind);
      const submissionKind: SubmissionKind = kindResult.success
        ? kindResult.data
        : inferSubmissionKind(formId, fields);
      const receivedAt = typeof raw.receivedAt === "string" && !Number.isNaN(Date.parse(raw.receivedAt))
        ? raw.receivedAt
        : new Date(0).toISOString();
      const saved = state[id] ?? {};
      const activities = parseActivity(saved.activity, receivedAt);
      const updatedAt = activities.reduce(
        (latest, entry) => Date.parse(entry.at) > Date.parse(latest) ? entry.at : latest,
        receivedAt,
      );

      legacy.push({
        siteId: "", // filled after site lookup
        id,
        formId,
        kind: submissionKind,
        fields,
        pageUrl: typeof raw.pageUrl === "string" ? raw.pageUrl.slice(0, 2048) : undefined,
        meta: stringMeta(raw.meta),
        status: status(saved.status),
        bookingStatus: submissionKind === "booking" ? bookingStatus(saved.bookingStatus) : undefined,
        receivedAt,
        createdAt: receivedAt,
        updatedAt,
        activity: activities,
      });
    } catch {
      malformed += 1;
      // Preserve legacy numbering by using the original JSONL line index for IDs.
    }
  }

  const repositories = createPostgresRepositories();
  const site = await repositories.sites.findByKey(siteKey);
  if (!site) throw new Error(`No PostgreSQL Site exists for site key "${siteKey}".`);
  for (const item of legacy) item.siteId = site.id;

  const existing = await repositories.submissions.list(site.id);
  const byId = new Map(existing.map((item) => [item.id, item]));
  let creates = 0;
  let updates = 0;
  let unchanged = 0;
  const writeItems: CreateSubmissionInput[] = [];

  console.log("Staark Storage v2 — legacy submissions/inbox → PostgreSQL");
  console.log(`Mode: ${write ? "WRITE" : "DRY RUN (zero writes)"}`);
  console.log(`Site: ${siteKey}`);
  console.log(`JSONL lines: ${lines.length}`);
  console.log(`Valid submissions: ${legacy.length}`);
  if (malformed) console.log(`Malformed/skipped lines: ${malformed}`);

  for (const item of legacy) {
    const current = byId.get(item.id);
    const currentComparable = current
      ? {
          formId: current.formId,
          kind: current.kind,
          fields: current.fields,
          pageUrl: current.pageUrl ?? null,
          meta: current.meta ?? {},
          status: current.status,
          bookingStatus: current.bookingStatus ?? null,
          receivedAt: current.receivedAt,
          activity: current.activity.map(({ at, actor, message }) => ({ at, actor, message })),
        }
      : null;
    const nextComparable = comparable(item);

    if (!current) {
      creates += 1;
      writeItems.push(item);
      console.log(`  + create     ${item.id} ${item.kind} ${item.formId}`);
    } else if (JSON.stringify(currentComparable) !== JSON.stringify(nextComparable)) {
      updates += 1;
      writeItems.push(item);
      console.log(`  ~ update     ${item.id} ${item.kind} ${item.formId}`);
    } else {
      unchanged += 1;
      console.log(`  = unchanged  ${item.id}`);
    }
  }

  console.log(`Summary: +${creates} ~${updates} =${unchanged}`);

  if (!write) {
    console.log("Dry-run complete. No database writes were performed.");
    console.log("Re-run with --write to apply this plan transactionally.");
    return;
  }

  await withPostgresTransaction(async (tx) => {
    for (const item of writeItems) {
      await tx.submissions.upsert(item);
    }
  });

  console.log("Write complete. Legacy submissions.jsonl and inbox-state.json were not modified.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
