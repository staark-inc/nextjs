import {
  createHmac,
} from "node:crypto";

type SetupActivationInput = {
  siteId: string;
  siteKey: string;
  ownerEmail: string | null;
};

function config() {
  const url =
    process.env.STAARK_HUB_ACTIVATION_URL?.trim();

  const secret =
    process.env.STAARK_PROVISIONING_SECRET?.trim();

  if (!url || !secret) {
    return null;
  }

  return {
    url,
    secret,
  };
}

export async function notifyHubSetupActivated(
  input: SetupActivationInput,
): Promise<boolean> {
  const cfg = config();

  if (!cfg) {
    console.warn(
      "[STAARK] Hub activation callback is not configured.",
    );

    return false;
  }

  const body = JSON.stringify({
    siteId: input.siteId,
    siteKey: input.siteKey,
    ownerEmail: input.ownerEmail,
    setupCompletedAt:
      new Date().toISOString(),
  });

  const timestamp =
    Math.floor(Date.now() / 1000).toString();

  const signature =
    createHmac("sha256", cfg.secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Staark-Timestamp": timestamp,
        "X-Staark-Signature": signature,
      },
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail =
        await response.text().catch(() => "");

      console.error(
        `[STAARK] Hub activation callback failed: ${response.status}`,
        detail,
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[STAARK] Hub activation callback failed:",
      error,
    );

    return false;
  }
}
