import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/db/prisma";
import { hasPublicSubscriptionAccess } from "@/lib/subscription-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLOCK_SKEW_SECONDS = 300;
const DOMAIN_RETENTION_DAYS = 30;

const PLAN_KEYS = {
  STARTER: "start",
  SAAS: "saas",
  BUSINESS: "business",
} as const;

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");

    return (
      aa.length > 0 &&
      aa.length === bb.length &&
      timingSafeEqual(aa, bb)
    );
  } catch {
    return false;
  }
}

function verifyRequest(
  body: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): boolean {
  if (!timestamp || !signature) return false;

  const unix = Number(timestamp);
  if (!Number.isInteger(unix)) return false;

  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - unix) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return safeEqualHex(expected, signature);
}

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function optionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid subscription date.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

function addDays(value: Date, days: number): Date {
  return new Date(
    value.getTime() +
      days * 24 * 60 * 60 * 1000,
  );
}

export async function POST(request: Request) {
  const secret =
    process.env.STAARK_PROVISIONING_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "STAARK_PROVISIONING_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (
    !verifyRequest(
      rawBody,
      request.headers.get("x-staark-timestamp"),
      request.headers.get("x-staark-signature"),
      secret,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid subscription sync signature.",
      },
      { status: 401 },
    );
  }

  try {
    const body = JSON.parse(rawBody || "{}") as {
      stripeSubscriptionId?: unknown;
      planCode?: unknown;
      status?: unknown;
      currentPeriodStart?: unknown;
      currentPeriodEnd?: unknown;
      cancelAtPeriodEnd?: unknown;
    };

    const stripeSubscriptionId = required(
      body.stripeSubscriptionId,
      "stripeSubscriptionId",
    );

    const status = required(
      body.status,
      "status",
    ).toLowerCase();

    const planCode = required(
      body.planCode,
      "planCode",
    ) as keyof typeof PLAN_KEYS;

    const planKey = PLAN_KEYS[planCode];

    if (!planKey) {
      throw new Error(
        `Unsupported planCode: ${planCode}`,
      );
    }

    const prisma = getPrismaClient();

    const existing =
      await prisma.subscription.findUnique({
        where: {
          providerSubscriptionId:
            stripeSubscriptionId,
        },
        select: {
          id: true,
          siteId: true,
        },
      });

    if (!existing?.siteId) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          "Runtime subscription does not exist yet.",
      });
    }

    const plan = await prisma.plan.findUnique({
      where: {
        key: planKey,
      },
      select: {
        id: true,
      },
    });

    if (!plan) {
      throw new Error(
        `Runtime plan "${planKey}" does not exist.`,
      );
    }

    const publicAccess =
      hasPublicSubscriptionAccess(status);

    const now = new Date();
    const releaseAt =
      publicAccess
        ? null
        : addDays(
            now,
            DOMAIN_RETENTION_DAYS,
          );

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: {
          id: existing.id,
        },
        data: {
          planId: plan.id,
          status,
          currentPeriodStart:
            optionalDate(
              body.currentPeriodStart,
            ),
          currentPeriodEnd:
            optionalDate(
              body.currentPeriodEnd,
            ),
          trialEndsAt:
            null,
          cancelAtPeriodEnd:
            body.cancelAtPeriodEnd === true,
        },
      });

      if (publicAccess) {
        await tx.domain.updateMany({
          where: {
            siteId: existing.siteId!,
            releasedAt: null,
          },
          data: {
            blockedAt: null,
            releaseAt: null,
          },
        });
      } else {
        await tx.domain.updateMany({
          where: {
            siteId: existing.siteId!,
            releasedAt: null,
          },
          data: {
            blockedAt: now,
            releaseAt,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      publicAccess,
      status,
      blockedAt:
        publicAccess
          ? null
          : now.toISOString(),
      releaseAt:
        releaseAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error(
      "[STAARK] Subscription sync failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Subscription sync failed.",
      },
      { status: 400 },
    );
  }
}
