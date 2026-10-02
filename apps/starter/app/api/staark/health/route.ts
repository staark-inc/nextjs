import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLOCK_SKEW_SECONDS = 300;

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

  if (
    Math.abs(now - unix) >
    MAX_CLOCK_SKEW_SECONDS
  ) {
    return false;
  }

  const expected = createHmac(
    "sha256",
    secret,
  )
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return safeEqualHex(
    expected,
    signature,
  );
}

function uuid(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return null;
  }

  return value;
}

export async function POST(
  request: Request,
) {
  const secret =
    process.env.STAARK_PROVISIONING_SECRET
      ?.trim();

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

  const rawBody =
    await request.text();

  if (
    !verifyRequest(
      rawBody,
      request.headers.get(
        "x-staark-timestamp",
      ),
      request.headers.get(
        "x-staark-signature",
      ),
      secret,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid health signature.",
      },
      { status: 401 },
    );
  }

  const payload =
    JSON.parse(rawBody || "{}") as {
      siteId?: unknown;
    };

  const siteId =
    uuid(payload.siteId);

  if (!siteId) {
    return NextResponse.json(
      {
        ok: false,
        error: "siteId must be a UUID.",
      },
      { status: 400 },
    );
  }

  try {
    const prisma =
      getPrismaClient();

    const site =
      await prisma.site.findUnique({
        where: {
          id: siteId,
        },

        select: {
          id: true,
          key: true,
          name: true,
          setupCompletedAt: true,
          createdAt: true,
          updatedAt: true,

          domains: {
            orderBy: [
              {
                primaryDomain:
                  "desc",
              },
              {
                createdAt: "asc",
              },
            ],

            select: {
              hostname: true,
              type: true,
              verified: true,
              primaryDomain: true,
              sslStatus: true,
            },
          },

          pages: {
            where: {
              deletedAt: null,
            },

            select: {
              id: true,
            },
          },

          usage: {
            select: {
              storageBytes: true,
              mediaCount: true,
              pagesCount: true,
              submissionsCount: true,
              updatedAt: true,
            },
          },

          subscriptions: {
            orderBy: {
              updatedAt: "desc",
            },

            take: 1,

            select: {
              id: true,
              status: true,
              billingInterval: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              updatedAt: true,

              plan: {
                select: {
                  key: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json(
      {
        ok: true,

        runtime: {
          status: "online",
          releaseId:
            process.env
              .STAARK_RELEASE_ID ??
            null,
          releaseVersion:
            process.env
              .STAARK_RELEASE_VERSION ??
            null,
        },

        database: {
          ok: true,
        },

        site: site
          ? {
              exists: true,
              id: site.id,
              key: site.key,
              name: site.name,

              setupCompleted:
                Boolean(
                  site.setupCompletedAt,
                ),

              setupCompletedAt:
                site.setupCompletedAt
                  ?.toISOString() ??
                null,

              pageCount:
                site.pages.length,

              domains:
                site.domains,

              usage: site.usage
                ? {
                    storageBytes:
                      site.usage
                        .storageBytes
                        .toString(),

                    mediaCount:
                      site.usage
                        .mediaCount,

                    pagesCount:
                      site.usage
                        .pagesCount,

                    submissionsCount:
                      site.usage
                        .submissionsCount,

                    updatedAt:
                      site.usage
                        .updatedAt
                        .toISOString(),
                  }
                : null,

              subscription:
                site
                  .subscriptions[0]
                  ? {
                      ...site
                        .subscriptions[0],

                      currentPeriodEnd:
                        site
                          .subscriptions[0]
                          .currentPeriodEnd
                          ?.toISOString() ??
                        null,

                      updatedAt:
                        site
                          .subscriptions[0]
                          .updatedAt
                          .toISOString(),
                    }
                  : null,

              createdAt:
                site.createdAt
                  .toISOString(),

              updatedAt:
                site.updatedAt
                  .toISOString(),
            }
          : {
              exists: false,
              id: siteId,
            },

        checkedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "[STAARK] Runtime health failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        runtime: {
          status: "online",
        },
        database: {
          ok: false,
        },
        error:
          "Runtime health check failed.",
        checkedAt:
          new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
