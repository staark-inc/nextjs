import {
  getPrismaClient,
} from "./db/prisma";

import {
  requireAdminTenantContext,
} from "./admin-tenant";

import {
  asActionConfig,
  asTriggerConfig,
  parseAutomationDefinition,
} from "./automation-types";

import {
  toPrismaJson,
} from "./repositories/postgres/json";

function mapAutomation(
  row: {
    id: string;
    name: string;
    enabled: boolean;
    trigger: string;
    triggerConfig: unknown;
    action: string;
    actionConfig: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    id:
      row.id,

    name:
      row.name,

    enabled:
      row.enabled,

    trigger:
      row.trigger,

    triggerConfig:
      asTriggerConfig(
        row.triggerConfig,
      ),

    action:
      row.action,

    actionConfig:
      asActionConfig(
        row.actionConfig,
      ),

    createdAt:
      row.createdAt.toISOString(),

    updatedAt:
      row.updatedAt.toISOString(),
  };
}

export async function listAdminAutomations() {
  const tenant =
    await requireAdminTenantContext();

  const prisma =
    getPrismaClient();

  const rows =
    await prisma.automation.findMany({
      where: {
        siteId:
          tenant.siteId,
      },

      orderBy: [
        {
          enabled:
            "desc",
        },

        {
          createdAt:
            "desc",
        },
      ],
    });

  return rows.map(
    mapAutomation,
  );
}

export async function createAdminAutomation(
  input: unknown,
) {
  const tenant =
    await requireAdminTenantContext();

  const parsed =
    parseAutomationDefinition(
      input,
    );

  const row =
    await getPrismaClient()
      .automation.create({
        data: {
          siteId:
            tenant.siteId,

          name:
            parsed.name,

          enabled:
            parsed.enabled ??
            true,

          trigger:
            parsed.trigger,

          triggerConfig:
            toPrismaJson(
              parsed.triggerConfig,
            ),

          action:
            parsed.action,

          actionConfig:
            toPrismaJson(
              parsed.actionConfig,
            ),
        },
      });

  return mapAutomation(
    row,
  );
}

export async function updateAdminAutomation(
  id: string,
  input: unknown,
) {
  const tenant =
    await requireAdminTenantContext();

  const prisma =
    getPrismaClient();

  const current =
    await prisma.automation.findFirst({
      where: {
        id,
        siteId:
          tenant.siteId,
      },
    });

  if (!current) {
    return null;
  }

  const raw =
    input &&
    typeof input === "object" &&
    !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};

  if (
    Object.keys(raw).length ===
      1 &&
    typeof raw.enabled ===
      "boolean"
  ) {
    const row =
      await prisma.automation.update({
        where: {
          id:
            current.id,
        },

        data: {
          enabled:
            raw.enabled,
        },
      });

    return mapAutomation(
      row,
    );
  }

  const parsed =
    parseAutomationDefinition({
      name:
        raw.name ??
        current.name,

      enabled:
        raw.enabled ??
        current.enabled,

      trigger:
        raw.trigger ??
        current.trigger,

      triggerConfig:
        raw.triggerConfig ??
        current.triggerConfig,

      action:
        raw.action ??
        current.action,

      actionConfig:
        raw.actionConfig ??
        current.actionConfig,
    });

  const row =
    await prisma.automation.update({
      where: {
        id:
          current.id,
      },

      data: {
        name:
          parsed.name,

        enabled:
          parsed.enabled ??
          true,

        trigger:
          parsed.trigger,

        triggerConfig:
          toPrismaJson(
            parsed.triggerConfig,
          ),

        action:
          parsed.action,

        actionConfig:
          toPrismaJson(
            parsed.actionConfig,
          ),
      },
    });

  return mapAutomation(
    row,
  );
}

export async function deleteAdminAutomation(
  id: string,
): Promise<boolean> {
  const tenant =
    await requireAdminTenantContext();

  const prisma =
    getPrismaClient();

  const current =
    await prisma.automation.findFirst({
      where: {
        id,
        siteId:
          tenant.siteId,
      },

      select: {
        id: true,
      },
    });

  if (!current) {
    return false;
  }

  await prisma.automation.delete({
    where: {
      id:
        current.id,
    },
  });

  return true;
}

export async function listAdminAutomationRuns(
  limit = 50,
) {
  const tenant =
    await requireAdminTenantContext();

  const rows =
    await getPrismaClient()
      .automationRun.findMany({
        where: {
          siteId:
            tenant.siteId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          Math.min(
            Math.max(
              limit,
              1,
            ),
            100,
          ),

        include: {
          automation: {
            select: {
              name:
                true,
            },
          },
        },
      });

  return rows.map(
    (row) => ({
      id:
        row.id,

      automationId:
        row.automationId,

      automationName:
        row.automation.name,

      eventType:
        row.eventType,

      status:
        row.status,

      attempt:
        row.attempt,

      error:
        row.error,

      createdAt:
        row.createdAt.toISOString(),

      startedAt:
        row.startedAt?.toISOString() ??
        null,

      finishedAt:
        row.finishedAt?.toISOString() ??
        null,
    }),
  );
}
