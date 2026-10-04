import crypto from "node:crypto";

type HubBillingPortalResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
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
      `${base}/api/saas/billing/portal`,

    secret,
  };
}

export function hubBillingConfigured(): boolean {
  return Boolean(
    (
      process.env
        .STAARK_HUB_INTERNAL_URL ??
      process.env
        .STAARK_HUB_URL
    )
      ?.trim() &&
    process.env
      .STAARK_PROVISIONING_SECRET
      ?.trim(),
  );
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

export async function createHubBillingPortalSession(
  input: {
    runtimeSiteId: string;
    stripeSubscriptionId: string;
    returnUrl: string;
  },
): Promise<{
  url: string;
}> {
  const body =
    JSON.stringify({
      runtimeSiteId:
        input.runtimeSiteId,

      stripeSubscriptionId:
        input.stripeSubscriptionId,

      returnUrl:
        input.returnUrl,
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
      },
    );

  const data =
    await response
      .json()
      .catch(
        () => null,
      ) as
      | HubBillingPortalResponse
      | null;

  if (
    !response.ok ||
    !data?.ok ||
    !data.url
  ) {
    throw new Error(
      data?.error ||
        `Staark Hub returned HTTP ${response.status}.`,
    );
  }

  return {
    url:
      data.url,
  };
}
