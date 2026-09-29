import type { SubmissionKind } from "@staark/core";

export type SubmissionStatus = "new" | "read" | "replied" | "archived";
export type BookingStatus = "pending" | "confirmed" | "declined";

export type SubmissionActivityRecord = {
  id: string;
  at: string;
  actor: string;
  message: string;
};

export type SubmissionRecord = {
  siteId: string;
  id: string;
  formId: string;
  kind: SubmissionKind;
  fields: Record<string, unknown>;
  pageUrl?: string;
  meta?: Record<string, string>;
  status: SubmissionStatus;
  bookingStatus?: BookingStatus;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  activity: SubmissionActivityRecord[];
};

export type CreateSubmissionActivityInput = {
  at: string;
  actor: string;
  message: string;
};

export type CreateSubmissionInput = {
  siteId: string;
  id: string;
  formId: string;
  kind: SubmissionKind;
  fields: Record<string, unknown>;
  pageUrl?: string;
  meta?: Record<string, string>;
  status: SubmissionStatus;
  bookingStatus?: BookingStatus;
  receivedAt: string;
  createdAt?: string;
  updatedAt?: string;
  activity?: CreateSubmissionActivityInput[];
};

export type UpdateSubmissionInput = {
  status?: SubmissionStatus;
  bookingStatus?: BookingStatus;
  appendActivity?: CreateSubmissionActivityInput[];
};

export type SubmissionListOptions = {
  kind?: SubmissionKind;
  status?: SubmissionStatus;
};

export interface SubmissionRepository {
  list(siteId: string, options?: SubmissionListOptions): Promise<SubmissionRecord[]>;
  findById(siteId: string, id: string): Promise<SubmissionRecord | null>;
  create(input: CreateSubmissionInput): Promise<SubmissionRecord>;
  upsert(input: CreateSubmissionInput): Promise<SubmissionRecord>;
  update(siteId: string, id: string, input: UpdateSubmissionInput): Promise<SubmissionRecord | null>;
  clear(siteId: string): Promise<number>;
}
