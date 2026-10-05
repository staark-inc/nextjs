import type {
  BookingStatus,
  SubmissionRecord,
  SubmissionStatus,
} from "./repositories";

export const AUTOMATION_TRIGGERS = [
  "submission.received",
  "submission.status.changed",
  "booking.status.changed",
] as const;

export type AutomationTrigger =
  (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_ACTIONS = [
  "add_activity",
  "set_status",
  "set_booking_status",
] as const;

export type AutomationAction =
  (typeof AUTOMATION_ACTIONS)[number];

export type AutomationTriggerConfig = {
  kind?: "any" | "contact" | "lead" | "booking";
  formId?: string;
  fromStatus?: string;
  toStatus?: string;
};

export type AutomationActionConfig = {
  message?: string;
  status?: SubmissionStatus;
  bookingStatus?: BookingStatus;
};

export type AutomationEvent = {
  siteId: string;
  eventKey: string;
  eventType: AutomationTrigger;

  submission: Pick<
    SubmissionRecord,
    | "id"
    | "formId"
    | "kind"
    | "fields"
    | "pageUrl"
    | "status"
    | "bookingStatus"
  >;

  previousStatus?: SubmissionStatus;
  previousBookingStatus?: BookingStatus;
};

export type AutomationDefinitionInput = {
  name: string;
  enabled?: boolean;
  trigger: AutomationTrigger;
  triggerConfig: AutomationTriggerConfig;
  action: AutomationAction;
  actionConfig: AutomationActionConfig;
};

const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "new",
  "read",
  "replied",
  "archived",
];

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "declined",
];

function objectRecord(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parseAutomationDefinition(
  value: unknown,
): AutomationDefinitionInput {
  const raw = objectRecord(value);

  const name =
    typeof raw.name === "string"
      ? raw.name.trim().slice(0, 160)
      : "";

  if (!name) {
    throw new Error("Automation name is required.");
  }

  const trigger =
    typeof raw.trigger === "string" &&
    (
      AUTOMATION_TRIGGERS as readonly string[]
    ).includes(raw.trigger)
      ? raw.trigger as AutomationTrigger
      : null;

  if (!trigger) {
    throw new Error("Unknown automation trigger.");
  }

  const action =
    typeof raw.action === "string" &&
    (
      AUTOMATION_ACTIONS as readonly string[]
    ).includes(raw.action)
      ? raw.action as AutomationAction
      : null;

  if (!action) {
    throw new Error("Unknown automation action.");
  }

  const triggerRaw =
    objectRecord(raw.triggerConfig);

  const actionRaw =
    objectRecord(raw.actionConfig);

  const kind =
    typeof triggerRaw.kind === "string" &&
    [
      "any",
      "contact",
      "lead",
      "booking",
    ].includes(triggerRaw.kind)
      ? triggerRaw.kind as AutomationTriggerConfig["kind"]
      : "any";

  const formId =
    typeof triggerRaw.formId === "string"
      ? triggerRaw.formId
          .trim()
          .slice(0, 64)
      : "";

  const fromStatus =
    typeof triggerRaw.fromStatus === "string"
      ? triggerRaw.fromStatus
          .trim()
          .slice(0, 40)
      : "";

  const toStatus =
    typeof triggerRaw.toStatus === "string"
      ? triggerRaw.toStatus
          .trim()
          .slice(0, 40)
      : "";

  const actionConfig:
    AutomationActionConfig = {};

  if (action === "add_activity") {
    const message =
      typeof actionRaw.message === "string"
        ? actionRaw.message
            .trim()
            .slice(0, 500)
        : "";

    if (!message) {
      throw new Error(
        "Activity message is required.",
      );
    }

    actionConfig.message =
      message;
  }

  if (action === "set_status") {
    const status =
      typeof actionRaw.status === "string" &&
      SUBMISSION_STATUSES.includes(
        actionRaw.status as SubmissionStatus,
      )
        ? actionRaw.status as SubmissionStatus
        : null;

    if (!status) {
      throw new Error(
        "A valid submission status is required.",
      );
    }

    actionConfig.status =
      status;
  }

  if (
    action ===
    "set_booking_status"
  ) {
    const bookingStatus =
      typeof actionRaw.bookingStatus === "string" &&
      BOOKING_STATUSES.includes(
        actionRaw.bookingStatus as BookingStatus,
      )
        ? actionRaw.bookingStatus as BookingStatus
        : null;

    if (!bookingStatus) {
      throw new Error(
        "A valid booking status is required.",
      );
    }

    actionConfig.bookingStatus =
      bookingStatus;
  }

  return {
    name,
    enabled:
      raw.enabled !== false,

    trigger,

    triggerConfig: {
      kind,
      ...(formId
        ? { formId }
        : {}),
      ...(fromStatus
        ? { fromStatus }
        : {}),
      ...(toStatus
        ? { toStatus }
        : {}),
    },

    action,
    actionConfig,
  };
}

export function asTriggerConfig(
  value: unknown,
): AutomationTriggerConfig {
  const raw =
    objectRecord(value);

  return {
    ...(typeof raw.kind === "string"
      ? {
          kind:
            raw.kind as AutomationTriggerConfig["kind"],
        }
      : {}),
    ...(typeof raw.formId === "string"
      ? {
          formId:
            raw.formId,
        }
      : {}),
    ...(typeof raw.fromStatus === "string"
      ? {
          fromStatus:
            raw.fromStatus,
        }
      : {}),
    ...(typeof raw.toStatus === "string"
      ? {
          toStatus:
            raw.toStatus,
        }
      : {}),
  };
}

export function asActionConfig(
  value: unknown,
): AutomationActionConfig {
  const raw =
    objectRecord(value);

  return {
    ...(typeof raw.message === "string"
      ? {
          message:
            raw.message,
        }
      : {}),
    ...(typeof raw.status === "string"
      ? {
          status:
            raw.status as SubmissionStatus,
        }
      : {}),
    ...(typeof raw.bookingStatus === "string"
      ? {
          bookingStatus:
            raw.bookingStatus as BookingStatus,
        }
      : {}),
  };
}
