import type { Prisma } from "@/generated/prisma/client";

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("Value is not JSON serializable.");
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}
