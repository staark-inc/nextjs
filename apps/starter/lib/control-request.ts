import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  sha256Hex,
  verifyControlRequest,
} from "@staark/core/sign";

export type VerifiedControlRequest =
  | {
      protocol: "v2";
      eventId: string;
      sequence: bigint;
    }
  | {
      protocol: "legacy";
      eventId: null;
      sequence: null;
    };

function safeEqualHex(
  a: string,
  b: string,
): boolean {
  try {
    const aa =
      Buffer.from(
        a,
        "hex",
      );

    const bb =
      Buffer.from(
        b,
        "hex",
      );

    return (
      aa.length > 0 &&
      aa.length === bb.length &&
      timingSafeEqual(
        aa,
        bb,
      )
    );
  } catch {
    return false;
  }
}

function verifyLegacy(
  body: string,
  headers: Headers,
  secret: string,
): boolean {
  const timestamp =
    headers.get(
      "x-staark-timestamp",
    );

  const signature =
    headers.get(
      "x-staark-signature",
    );

  if (
    !timestamp ||
    !signature
  ) {
    return false;
  }

  const unix =
    Number(timestamp);

  if (
    !Number.isInteger(
      unix,
    )
  ) {
    return false;
  }

  const now =
    Math.floor(
      Date.now() /
        1000,
    );

  if (
    Math.abs(
      now - unix,
    ) > 300
  ) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret,
    )
      .update(
        `${timestamp}.${body}`,
      )
      .digest("hex");

  return safeEqualHex(
    expected,
    signature,
  );
}

export function verifyHubControlRequest(
  request: Request,
  body: string,
  secret: string,
): VerifiedControlRequest | null {
  const pathname =
    new URL(
      request.url,
    ).pathname;

  const v2 =
    verifyControlRequest({
      method:
        request.method,

      path:
        pathname,

      body,
      headers:
        request.headers,

      secret,
    });

  if (v2.ok) {
    return {
      protocol: "v2",
      eventId:
        v2.eventId,
      sequence:
        v2.sequence,
    };
  }

  /*
   * Temporary rollout bridge.
   *
   * Remove/disable after Hub B2.13.2 is deployed.
   */
  if (
    process.env
      .STAARK_ALLOW_LEGACY_CONTROL_SIGNATURE ===
      "0"
  ) {
    return null;
  }

  if (
    verifyLegacy(
      body,
      request.headers,
      secret,
    )
  ) {
    console.warn(
      "[control] Accepted legacy Hub signature. Upgrade Hub sender to protocol v2.",
    );

    return {
      protocol:
        "legacy",
      eventId: null,
      sequence: null,
    };
  }

  return null;
}

export function controlBodyHash(
  body: string,
): string {
  return sha256Hex(body);
}
