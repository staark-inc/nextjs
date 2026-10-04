import crypto from "node:crypto";

import { requireAdminTenantContext } from "./admin-tenant";
import { getPrismaClient } from "./db/prisma";

export type TenantAnnouncement = {
  id: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  coverImageUrl: string | null;
  pinned: boolean;
  kind: string;
  audiencePlan: string | null;
  publishedAt: string;
};

export type TenantAnnouncementFeed = {
  available: boolean;
  items: TenantAnnouncement[];
  error: string | null;
};

function config(): {
  url: string;
  secret: string;
} {
  const base =
    (
      process.env
        .STAARK_HUB_INTERNAL_URL ??
      process.env
        .STAARK_HUB_URL
    )
      ?.trim()
      .replace(
        /\/+$/,
        "",
      );

  const secret =
    process.env
      .STAARK_PROVISIONING_SECRET
      ?.trim();

  if (!base) {
    throw new Error(
      "STAARK_HUB_INTERNAL_URL is not configured.",
    );
  }

  if (!secret) {
    throw new Error(
      "STAARK_PROVISIONING_SECRET is not configured.",
    );
  }

  return {
    url:
      `${base}/api/saas/announcements`,

    secret,
  };
}

function sign(
  body: string,
  timestamp: string,
  secret: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      `${timestamp}.${body}`,
    )
    .digest(
      "hex",
    );
}

export async function readAdminAnnouncements(
  requestedLimit = 10,
): Promise<TenantAnnouncementFeed> {
  try {
    const tenant =
      await requireAdminTenantContext();

    const subscription =
      await getPrismaClient()
        .subscription
        .findUnique({
          where: {
            siteId:
              tenant.siteId,
          },

          select: {
            providerSubscriptionId:
              true,
          },
        });

    const stripeSubscriptionId =
      subscription
        ?.providerSubscriptionId;

    if (!stripeSubscriptionId) {
      return {
        available:
          false,

        items:
          [],

        error:
          "Subscription is not synchronized with Staark Hub.",
      };
    }

    const limit =
      Math.min(
        50,
        Math.max(
          1,
          Math.floor(
            requestedLimit,
          ),
        ),
      );

    const body =
      JSON.stringify({
        runtimeSiteId:
          tenant.siteId,

        stripeSubscriptionId,

        limit,
      });

    const timestamp =
      Math.floor(
        Date.now() / 1000,
      ).toString();

    const {
      url,
      secret,
    } =
      config();

    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Staark-Timestamp":
              timestamp,

            "X-Staark-Signature":
              sign(
                body,
                timestamp,
                secret,
              ),
          },

          body,

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              5000,
            ),
        },
      );

    const data =
      await response
        .json()
        .catch(
          () => null,
        ) as
        | {
            ok?: boolean;

            announcements?: Array<{
              id?: unknown;
              title?: unknown;
              summary?: unknown;
              body?: unknown;
              bodyFormat?: unknown;
              ctaLabel?: unknown;
              ctaUrl?: unknown;
              coverImageUrl?: unknown;
              pinned?: unknown;
              kind?: unknown;
              audiencePlan?: unknown;
              publishedAt?: unknown;
            }>;

            error?: string;
          }
        | null;

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
          `Staark Hub returned HTTP ${response.status}.`,
      );
    }

    const items =
      (
        data.announcements ??
        []
      )
        .filter(
          (item) =>
            typeof item.id ===
              "string" &&
            typeof item.title ===
              "string" &&
            typeof item.summary ===
              "string" &&
            typeof item.body ===
              "string" &&
            typeof item.kind ===
              "string" &&
            typeof item.publishedAt ===
              "string" && Number.isFinite(Date.parse(item.publishedAt)),
        )
        .map(
          (item) => ({
            id:
              item.id as string,

            title:
              item.title as string,

            summary:
              item.summary as string,

            body:
              item.body as string,

            bodyFormat: item.bodyFormat === "markdown" ? "markdown" : "plain",
            ctaLabel: typeof item.ctaLabel === "string" ? item.ctaLabel : null,
            ctaUrl: typeof item.ctaUrl === "string" ? item.ctaUrl : null,
            coverImageUrl: typeof item.coverImageUrl === "string" ? item.coverImageUrl : null,
            pinned: item.pinned === true,

            kind:
              item.kind as string,

            audiencePlan:
              typeof item.audiencePlan ===
                "string"
                ? item.audiencePlan
                : null,

            publishedAt:
              item.publishedAt as string,
          }),
        );

    return {
      available:
        true,

      items,

      error:
        null,
    };
  } catch (error) {
    console.error(
      "[announcements]",
      error,
    );

    return {
      available:
        false,

      items:
        [],

      error:
        error instanceof Error
          ? error.message
          : "Updates are temporarily unavailable.",
    };
  }
}
