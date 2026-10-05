import {
  getPlanFeatureAccess,
} from "./feature-access";

import {
  getPrismaClient,
} from "./db/prisma";

import {
  createPostgresRepositories,
  type SubmissionRecord,
} from "./repositories";

import {
  asActionConfig,
  asTriggerConfig,
  type AutomationAction,
  type AutomationEvent,
  type AutomationTrigger,
} from "./automation-types";

import {
  toPrismaJson,
} from "./repositories/postgres/json";

import {
  publishAdminRealtime,
} from "./admin-realtime";

type Rule = {
  id: string;
  siteId: string;
  name: string;
  enabled: boolean;
  trigger: string;
  triggerConfig: unknown;
  action: string;
  actionConfig: unknown;
};

function objectRecord(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function automationFeatureEnabled(
  siteId: string,
): Promise<boolean> {
  const prisma =
    getPrismaClient();

  const subscription =
    await prisma.subscription.findFirst({
      where: {
        siteId,
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        plan: {
          select: {
            entitlements: true,
          },
        },
      },
    });

  if (!subscription) {
    return false;
  }

  return getPlanFeatureAccess(
    objectRecord(
      subscription.plan.entitlements,
    ),
    "automations",
  ).enabled;
}

function ruleMatches(
  rule: Rule,
  event: AutomationEvent,
): boolean {
  if (
    rule.trigger !==
    event.eventType
  ) {
    return false;
  }

  const config =
    asTriggerConfig(
      rule.triggerConfig,
    );

  if (
    config.kind &&
    config.kind !== "any" &&
    config.kind !==
      event.submission.kind
  ) {
    return false;
  }

  if (
    config.formId &&
    config.formId !==
      event.submission.formId
  ) {
    return false;
  }

  if (
    config.fromStatus
  ) {
    const previous =
      event.eventType ===
      "booking.status.changed"
        ? event.previousBookingStatus
        : event.previousStatus;

    if (
      previous !==
      config.fromStatus
    ) {
      return false;
    }
  }

  if (
    config.toStatus
  ) {
    const current =
      event.eventType ===
      "booking.status.changed"
        ? event.submission.bookingStatus
        : event.submission.status;

    if (
      current !==
      config.toStatus
    ) {
      return false;
    }
  }

  return true;
}

function fieldText(
  submission:
    AutomationEvent["submission"],
  key: string,
): string {
  const value =
    submission.fields[key];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(
      value,
    );
  }

  return "";
}

function renderMessage(
  template: string,
  event: AutomationEvent,
): string {
  const values:
    Record<string, string> = {
      submissionId:
        event.submission.id,

      kind:
        event.submission.kind,

      status:
        event.submission.status,

      bookingStatus:
        event.submission
          .bookingStatus ??
        "",

      name:
        fieldText(
          event.submission,
          "name",
        ),

      email:
        fieldText(
          event.submission,
          "email",
        ),

      phone:
        fieldText(
          event.submission,
          "phone",
        ),
    };

  return template.replace(
    /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
    (
      original,
      key: string,
    ) =>
      Object.prototype.hasOwnProperty.call(
        values,
        key,
      )
        ? values[key] ?? ""
        : original,
  );
}

async function executeAction(
  rule: Rule,
  event: AutomationEvent,
): Promise<Record<string, unknown>> {
  const action =
    rule.action as AutomationAction;

  const config =
    asActionConfig(
      rule.actionConfig,
    );

  const repositories =
    createPostgresRepositories();

  const current =
    await repositories.submissions.findById(
      event.siteId,
      event.submission.id,
    );

  if (!current) {
    throw new Error(
      "Submission no longer exists.",
    );
  }

  const at =
    new Date().toISOString();

  if (
    action ===
    "add_activity"
  ) {
    const message =
      renderMessage(
        config.message ?? "",
        event,
      ).trim();

    if (!message) {
      throw new Error(
        "Automation activity message is empty.",
      );
    }

    await repositories.submissions.update(
      event.siteId,
      current.id,
      {
        appendActivity: [
          {
            at,
            actor:
              "automation",

            message:
              message.slice(
                0,
                500,
              ),
          },
        ],
      },
    );

    await publishAdminRealtime(
      event.siteId,
      "inbox.updated",
      {
        submissionId:
          current.id,
        source:
          "automation",
      },
    );

    return {
      action,
      message,
    };
  }

  if (
    action ===
    "set_status"
  ) {
    if (!config.status) {
      throw new Error(
        "Automation status is missing.",
      );
    }

    if (
      current.status ===
      config.status
    ) {
      return {
        action,
        status:
          current.status,
        changed:
          false,
      };
    }

    await repositories.submissions.update(
      event.siteId,
      current.id,
      {
        status:
          config.status,

        appendActivity: [
          {
            at,
            actor:
              "automation",

            message:
              `Automation "${rule.name}": status ${current.status} → ${config.status}`,
          },
        ],
      },
    );

    await publishAdminRealtime(
      event.siteId,
      "inbox.updated",
      {
        submissionId:
          current.id,
        source:
          "automation",
        status:
          config.status,
      },
    );

    return {
      action,
      from:
        current.status,
      to:
        config.status,
      changed:
        true,
    };
  }

  if (
    action ===
    "set_booking_status"
  ) {
    if (
      current.kind !==
      "booking"
    ) {
      throw new Error(
        "Booking status can only be changed for booking submissions.",
      );
    }

    if (
      !config.bookingStatus
    ) {
      throw new Error(
        "Automation booking status is missing.",
      );
    }

    if (
      current.bookingStatus ===
      config.bookingStatus
    ) {
      return {
        action,
        status:
          current.bookingStatus,
        changed:
          false,
      };
    }

    await repositories.submissions.update(
      event.siteId,
      current.id,
      {
        bookingStatus:
          config.bookingStatus,

        appendActivity: [
          {
            at,
            actor:
              "automation",

            message:
              `Automation "${rule.name}": booking ${current.bookingStatus ?? "pending"} → ${config.bookingStatus}`,
          },
        ],
      },
    );

    await publishAdminRealtime(
      event.siteId,
      "inbox.updated",
      {
        submissionId:
          current.id,
        source:
          "automation",
        bookingStatus:
          config.bookingStatus,
      },
    );

    return {
      action,
      from:
        current.bookingStatus ??
        "pending",
      to:
        config.bookingStatus,
      changed:
        true,
    };
  }

  throw new Error(
    `Unsupported automation action: ${action}`,
  );
}

async function executeRun(
  runId: string,
  rule: Rule,
  event: AutomationEvent,
): Promise<void> {
  const prisma =
    getPrismaClient();

  await prisma.automationRun.update({
    where: {
      id: runId,
    },

    data: {
      status:
        "running",

      attempt: {
        increment: 1,
      },

      startedAt:
        new Date(),

      finishedAt:
        null,

      error:
        null,
    },
  });

  await publishAdminRealtime(
    event.siteId,
    "automation.started",
    {
      runId,
      automationId:
        rule.id,
      automationName:
        rule.name,
    },
  );

  try {
    const output =
      await executeAction(
        rule,
        event,
      );

    await prisma.automationRun.update({
      where: {
        id: runId,
      },

      data: {
        status:
          "success",

        output:
          toPrismaJson(
            output,
          ),

        error:
          null,

        finishedAt:
          new Date(),
      },
    });

    await publishAdminRealtime(
      event.siteId,
      "automation.succeeded",
      {
        runId,
        automationId:
          rule.id,
        automationName:
          rule.name,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    await prisma.automationRun.update({
      where: {
        id: runId,
      },

      data: {
        status:
          "failed",

        error:
          message.slice(
            0,
            4000,
          ),

        finishedAt:
          new Date(),
      },
    });

    await publishAdminRealtime(
      event.siteId,
      "automation.failed",
      {
        runId,
        automationId:
          rule.id,
        automationName:
          rule.name,
      },
    );
  }
}

export async function runAutomationEvent(
  event: AutomationEvent,
): Promise<void> {
  if (
    !await automationFeatureEnabled(
      event.siteId,
    )
  ) {
    return;
  }

  const prisma =
    getPrismaClient();

  const rules =
    await prisma.automation.findMany({
      where: {
        siteId:
          event.siteId,

        enabled:
          true,

        trigger:
          event.eventType,
      },

      orderBy: {
        createdAt:
          "asc",
      },
    });

  for (
    const rule of rules
  ) {
    if (
      !ruleMatches(
        rule,
        event,
      )
    ) {
      continue;
    }

    const existing =
      await prisma.automationRun.findUnique({
        where: {
          automationId_eventKey: {
            automationId:
              rule.id,

            eventKey:
              event.eventKey,
          },
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      continue;
    }

    let run:
      { id: string };

    try {
      run =
        await prisma.automationRun.create({
          data: {
            siteId:
              event.siteId,

            automationId:
              rule.id,

            eventKey:
              event.eventKey,

            eventType:
              event.eventType,

            input:
              toPrismaJson(
                event,
              ),
          },

          select: {
            id: true,
          },
        });
    } catch {
      /*
       * The unique automation/event key is the idempotency barrier.
       * A concurrent worker may have created the same run between
       * findUnique() and create().
       */
      continue;
    }

    await executeRun(
      run.id,
      rule,
      event,
    );
  }
}

export async function retryAutomationRun(
  siteId: string,
  runId: string,
): Promise<boolean> {
  if (
    !await automationFeatureEnabled(
      siteId,
    )
  ) {
    return false;
  }

  const prisma =
    getPrismaClient();

  const run =
    await prisma.automationRun.findFirst({
      where: {
        id:
          runId,

        siteId,
      },

      include: {
        automation:
          true,
      },
    });

  if (
    !run ||
    run.status !== "failed" ||
    !run.automation.enabled
  ) {
    return false;
  }

  const input =
    objectRecord(
      run.input,
    );

  const submission =
    objectRecord(
      input.submission,
    );

  if (
    typeof input.eventKey !==
      "string" ||
    typeof input.eventType !==
      "string" ||
    typeof input.siteId !==
      "string" ||
    typeof submission.id !==
      "string" ||
    typeof submission.formId !==
      "string" ||
    typeof submission.kind !==
      "string" ||
    typeof submission.status !==
      "string"
  ) {
    throw new Error(
      "Stored automation event is invalid.",
    );
  }

  const event =
    run.input as unknown as AutomationEvent;

  await executeRun(
    run.id,
    run.automation,
    event,
  );

  return true;
}

export function automationEventFromSubmission(
  record: SubmissionRecord,
  event: Omit<
    AutomationEvent,
    "siteId" | "submission"
  >,
): AutomationEvent {
  return {
    siteId:
      record.siteId,

    ...event,

    submission: {
      id:
        record.id,

      formId:
        record.formId,

      kind:
        record.kind,

      fields:
        record.fields,

      pageUrl:
        record.pageUrl,

      status:
        record.status,

      bookingStatus:
        record.bookingStatus,
    },
  };
}

export type {
  AutomationTrigger,
};
