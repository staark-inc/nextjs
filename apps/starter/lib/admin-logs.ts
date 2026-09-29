import {
  readStateText,
  writeStateText,
} from "./storage";

export type AdminLogLevel =
  | "info"
  | "warning"
  | "error";

export type AdminLogEntry = {
  id: string;
  at: string;
  level: AdminLogLevel;
  area: string;
  action: string;
  message: string;
  actor: string;
  meta?: Record<string, string | number | boolean | null>;
};

const LOG_FILE = "application-logs.jsonl";
const MAX_STORED_LOGS = 1000;

function makeId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function parseLogs(raw: string | null): AdminLogEntry[] {
  if (!raw?.trim()) return [];

  const result: AdminLogEntry[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;

    try {
      const parsed =
        JSON.parse(line) as Partial<AdminLogEntry>;

      if (
        typeof parsed.id !== "string" ||
        typeof parsed.at !== "string" ||
        typeof parsed.level !== "string" ||
        typeof parsed.area !== "string" ||
        typeof parsed.action !== "string" ||
        typeof parsed.message !== "string"
      ) {
        continue;
      }

      result.push({
        id: parsed.id,
        at: parsed.at,
        level:
          parsed.level === "error"
            ? "error"
            : parsed.level === "warning"
              ? "warning"
              : "info",
        area: parsed.area,
        action: parsed.action,
        message: parsed.message,
        actor:
          typeof parsed.actor === "string"
            ? parsed.actor
            : "system",
        ...(parsed.meta &&
        typeof parsed.meta === "object" &&
        !Array.isArray(parsed.meta)
          ? {
              meta: parsed.meta as Record<
                string,
                string | number | boolean | null
              >,
            }
          : {}),
      });
    } catch {
      // Ignore malformed historical lines.
    }
  }

  return result;
}

export async function appendAdminLog(input: {
  level?: AdminLogLevel;
  area: string;
  action: string;
  message: string;
  actor?: string;
  meta?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}): Promise<void> {
  try {
    const current = parseLogs(
      await readStateText(LOG_FILE),
    );

    const cleanMeta = input.meta
      ? Object.fromEntries(
          Object.entries(input.meta).filter(
            (
              entry,
            ): entry is [
              string,
              string | number | boolean | null,
            ] => entry[1] !== undefined,
          ),
        )
      : undefined;

    const entry: AdminLogEntry = {
      id: makeId(),
      at: new Date().toISOString(),
      level: input.level ?? "info",
      area: input.area.trim() || "system",
      action: input.action.trim() || "event",
      message: input.message.trim().slice(0, 1000),
      actor: input.actor?.trim() || "admin",
      ...(cleanMeta &&
      Object.keys(cleanMeta).length
        ? { meta: cleanMeta }
        : {}),
    };

    const next = [
      ...current,
      entry,
    ].slice(-MAX_STORED_LOGS);

    await writeStateText(
      LOG_FILE,
      `${next
        .map((item) => JSON.stringify(item))
        .join("\n")}\n`,
    );
  } catch (error) {
    // Logging must never break the operation being logged.
    console.error(
      "[staark] Could not persist application log:",
      (error as Error).message,
    );
  }
}

export async function listAdminLogs(
  limit = 200,
): Promise<AdminLogEntry[]> {
  const logs = parseLogs(
    await readStateText(LOG_FILE),
  );

  return logs
    .slice(-Math.max(1, Math.min(limit, 500)))
    .reverse();
}

export async function clearAdminLogs(): Promise<void> {
  await writeStateText(LOG_FILE, "");
}
