import type { SubmissionKind } from "@staark/core";

import type {
  BookingStatus,
  CreateSubmissionActivityInput,
  CreateSubmissionInput,
  SubmissionRecord,
  SubmissionRepository,
  SubmissionStatus,
  SubmissionListOptions,
  UpdateSubmissionInput,
} from "../submission-repository";
import type { RepositoryDbClient } from "./db-client";
import { toPrismaJson } from "./json";

const activityOrder = {
  orderBy: { at: "asc" as const },
};

const submissionInclude = {
  activities: activityOrder,
} as const;

type ActivityRow = {
  id: string;
  at: Date;
  actor: string;
  message: string;
};

type SubmissionRow = {
  siteId: string;
  id: string;
  formId: string;
  kind: string;
  fields: unknown;
  pageUrl: string | null;
  meta: unknown;
  status: string;
  bookingStatus: string | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  activities: ActivityRow[];
};

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  const raw = objectRecord(value);
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(raw)) {
    if (typeof item === "string") out[key] = item;
  }
  return Object.keys(out).length ? out : undefined;
}

function kind(value: string): SubmissionKind {
  if (value === "contact" || value === "lead" || value === "booking") return value;
  throw new Error(`Unsupported submission kind in PostgreSQL: ${value}.`);
}

function status(value: string): SubmissionStatus {
  if (value === "new" || value === "read" || value === "replied" || value === "archived") {
    return value;
  }
  throw new Error(`Unsupported submission status in PostgreSQL: ${value}.`);
}

function bookingStatus(value: string | null): BookingStatus | undefined {
  if (value === null) return undefined;
  if (value === "pending" || value === "confirmed" || value === "declined") return value;
  throw new Error(`Unsupported booking status in PostgreSQL: ${value}.`);
}

function mapSubmission(row: SubmissionRow): SubmissionRecord {
  return {
    siteId: row.siteId,
    id: row.id,
    formId: row.formId,
    kind: kind(row.kind),
    fields: objectRecord(row.fields),
    pageUrl: row.pageUrl ?? undefined,
    meta: stringRecord(row.meta),
    status: status(row.status),
    bookingStatus: bookingStatus(row.bookingStatus),
    receivedAt: row.receivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    activity: row.activities.map((entry) => ({
      id: entry.id,
      at: entry.at.toISOString(),
      actor: entry.actor,
      message: entry.message,
    })),
  };
}

function activityCreates(activity: CreateSubmissionActivityInput[] | undefined) {
  return (activity ?? []).map((entry) => ({
    at: new Date(entry.at),
    actor: entry.actor.slice(0, 80),
    message: entry.message.slice(0, 500),
  }));
}

function createData(input: CreateSubmissionInput) {
  return {
    site: { connect: { id: input.siteId } },
    id: input.id,
    formId: input.formId,
    kind: input.kind,
    fields: toPrismaJson(input.fields),
    pageUrl: input.pageUrl ?? null,
    meta: toPrismaJson(input.meta ?? {}),
    status: input.status,
    bookingStatus: input.kind === "booking" ? input.bookingStatus ?? "pending" : null,
    receivedAt: new Date(input.receivedAt),
    ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
    ...(input.updatedAt ? { updatedAt: new Date(input.updatedAt) } : {}),
    activities: {
      create: activityCreates(input.activity),
    },
  };
}

function updateDataForUpsert(input: CreateSubmissionInput) {
  return {
    formId: input.formId,
    kind: input.kind,
    fields: toPrismaJson(input.fields),
    pageUrl: input.pageUrl ?? null,
    meta: toPrismaJson(input.meta ?? {}),
    status: input.status,
    bookingStatus: input.kind === "booking" ? input.bookingStatus ?? "pending" : null,
    receivedAt: new Date(input.receivedAt),
    ...(input.updatedAt ? { updatedAt: new Date(input.updatedAt) } : {}),
    activities: {
      deleteMany: {},
      create: activityCreates(input.activity),
    },
  };
}

export class PostgresSubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: RepositoryDbClient) {}

  async list(
    siteId: string,
    options: SubmissionListOptions = {},
  ): Promise<SubmissionRecord[]> {
    const rows = await this.db.submission.findMany({
      where: {
        siteId,
        ...(options.kind ? { kind: options.kind } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      include: submissionInclude,
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => mapSubmission(row as SubmissionRow));
  }

  async findById(siteId: string, id: string): Promise<SubmissionRecord | null> {
    const row = await this.db.submission.findUnique({
      where: { siteId_id: { siteId, id } },
      include: submissionInclude,
    });
    return row ? mapSubmission(row as SubmissionRow) : null;
  }

  async create(input: CreateSubmissionInput): Promise<SubmissionRecord> {
    const row = await this.db.submission.create({
      data: createData(input),
      include: submissionInclude,
    });
    return mapSubmission(row as SubmissionRow);
  }

  async upsert(input: CreateSubmissionInput): Promise<SubmissionRecord> {
    const row = await this.db.submission.upsert({
      where: { siteId_id: { siteId: input.siteId, id: input.id } },
      create: createData(input),
      update: updateDataForUpsert(input),
      include: submissionInclude,
    });
    return mapSubmission(row as SubmissionRow);
  }

  async update(
    siteId: string,
    id: string,
    input: UpdateSubmissionInput,
  ): Promise<SubmissionRecord | null> {
    const current = await this.db.submission.findUnique({
      where: { siteId_id: { siteId, id } },
      select: { id: true },
    });
    if (!current) return null;

    const activity = activityCreates(input.appendActivity);
    const row = await this.db.submission.update({
      where: { siteId_id: { siteId, id } },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.bookingStatus ? { bookingStatus: input.bookingStatus } : {}),
        ...(activity.length
          ? { activities: { create: activity } }
          : {}),
      },
      include: submissionInclude,
    });
    return mapSubmission(row as SubmissionRow);
  }

  async clear(siteId: string): Promise<number> {
    const result = await this.db.submission.deleteMany({ where: { siteId } });
    return result.count;
  }
}
