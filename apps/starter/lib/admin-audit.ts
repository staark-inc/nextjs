import {
  appendAdminLog,
  type AdminLogLevel,
} from "./admin-logs";

import {
  getSession,
  isSessionActive,
} from "./auth";

type AuditPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined;

export type AdminAuditInput = {
  level?: AdminLogLevel;

  area: string;
  action: string;
  message: string;

  resource: string;
  resourceId?: string;

  changedKeys?: readonly string[];

  meta?: Record<
    string,
    AuditPrimitive
  >;
};

function stableValue(
  value: unknown,
): string {
  try {
    return JSON.stringify(
      value,
      Object.keys(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? value as Record<
              string,
              unknown
            >
          : {},
      ).sort(),
    );
  } catch {
    return String(value);
  }
}

export function changedObjectKeys(
  before: unknown,
  after: unknown,
  ignored:
    readonly string[] = [],
): string[] {
  if (
    !before ||
    typeof before !== "object" ||
    Array.isArray(before) ||
    !after ||
    typeof after !== "object" ||
    Array.isArray(after)
  ) {
    return [];
  }

  const ignoredSet =
    new Set(ignored);

  const left =
    before as Record<
      string,
      unknown
    >;

  const right =
    after as Record<
      string,
      unknown
    >;

  return Array.from(
    new Set([
      ...Object.keys(left),
      ...Object.keys(right),
    ]),
  )
    .filter(
      (key) =>
        !ignoredSet.has(key),
    )
    .filter(
      (key) =>
        stableValue(left[key]) !==
        stableValue(right[key]),
    )
    .sort();
}

export async function appendAdminAction(
  input: AdminAuditInput,
): Promise<void> {
  let actor =
    "system";

  let actorRole:
    | "client"
    | "manager"
    | "system" =
    "system";

  try {
    const session =
      await getSession();

    if (
      isSessionActive(
        session,
      )
    ) {
      actor =
        session.username?.trim() ||
        session.userId?.trim() ||
        session.role ||
        "admin";

      actorRole =
        session.role === "client"
          ? "client"
          : session.role === "manager"
            ? "manager"
            : "system";
    }
  } catch {
    /*
     * Audit must remain available for system-triggered
     * operations outside a normal admin request.
     */
  }

  const changedKeys =
    input.changedKeys
      ?.map(
        (key) =>
          key.trim(),
      )
      .filter(Boolean);

  await appendAdminLog({
    level:
      input.level ??
      "info",

    area:
      input.area,

    action:
      input.action,

    message:
      input.message,

    actor,
    actorRole,

    meta: {
      resource:
        input.resource,

      ...(input.resourceId
        ? {
            resourceId:
              input.resourceId,
          }
        : {}),

      ...(changedKeys?.length
        ? {
            changedKeys:
              changedKeys.join(
                ",",
              ),
          }
        : {}),

      role:
        actorRole,

      ...input.meta,
    },
  });
}
