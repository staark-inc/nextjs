import type {
  StaarkLogMeta,
  StaarkLogMetaValue,
} from "./types.ts";

export const REDACTED_LOG_VALUE =
  "[REDACTED]" as const;

const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 100;
const MAX_STRING_LENGTH = 4_000;

const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "passphrase",
  "secret",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "api-key",
  "apikey",
  "api_key",
  "private-key",
  "privatekey",
  "private_key",
  "client-secret",
  "clientsecret",
  "client_secret",
  "access-token",
  "accesstoken",
  "access_token",
  "refresh-token",
  "refreshtoken",
  "refresh_token",
  "session",
  "sessionid",
  "session_id",
];

function normalizeKey(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function isSensitiveLogKey(
  key: string,
): boolean {
  const normalized = normalizeKey(key);

  return SENSITIVE_KEY_PATTERNS.some(
    (pattern) =>
      normalized === pattern ||
      normalized.includes(pattern),
  );
}

function sanitizeString(
  value: string,
): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(
    0,
    MAX_STRING_LENGTH,
  )}…[TRUNCATED]`;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): StaarkLogMetaValue {
  if (depth > MAX_DEPTH) {
    return "[MAX_DEPTH]";
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: sanitizeString(value.name),
      message: sanitizeString(value.message),
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    const result = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) =>
        sanitizeValue(
          item,
          depth + 1,
          seen,
        ),
      );

    seen.delete(value);

    if (value.length > MAX_ARRAY_ITEMS) {
      result.push(
        `[TRUNCATED:${
          value.length - MAX_ARRAY_ITEMS
        }]`,
      );
    }

    return result;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    const result: Record<
      string,
      StaarkLogMetaValue
    > = {};

    const entries = Object.entries(
      value as Record<string, unknown>,
    ).slice(0, MAX_OBJECT_KEYS);

    for (const [key, item] of entries) {
      result[key] = isSensitiveLogKey(key)
        ? REDACTED_LOG_VALUE
        : sanitizeValue(
            item,
            depth + 1,
            seen,
          );
    }

    if (
      Object.keys(
        value as Record<string, unknown>,
      ).length > MAX_OBJECT_KEYS
    ) {
      result.__truncated =
        "[OBJECT_KEYS_TRUNCATED]";
    }

    seen.delete(value);

    return result;
  }

  if (value === undefined) {
    return "[UNDEFINED]";
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return "[FUNCTION]";
  }

  return String(value);
}

export function sanitizeLogMeta(
  input:
    | Record<string, unknown>
    | undefined,
): StaarkLogMeta | undefined {
  if (!input) {
    return undefined;
  }

  const result: StaarkLogMeta = {};
  const seen = new WeakSet<object>();

  for (
    const [key, value] of Object.entries(
      input,
    ).slice(0, MAX_OBJECT_KEYS)
  ) {
    result[key] = isSensitiveLogKey(key)
      ? REDACTED_LOG_VALUE
      : sanitizeValue(value, 0, seen);
  }

  if (
    Object.keys(input).length >
    MAX_OBJECT_KEYS
  ) {
    result.__truncated =
      "[OBJECT_KEYS_TRUNCATED]";
  }

  return Object.keys(result).length
    ? result
    : undefined;
}
