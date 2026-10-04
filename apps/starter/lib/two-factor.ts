import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  resolveAdminAuthConfig,
} from "@staark/platform/server";

const BASE32 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;

function encryptionKey(): Buffer {
  const explicit =
    process.env.STAARK_2FA_ENCRYPTION_KEY
      ?.trim();

  const source =
    explicit ||
    `${resolveAdminAuthConfig().sessionSecret}:staark:2fa:v1`;

  return createHash("sha256")
    .update(source)
    .digest();
}

export function encryptTwoFactorSecret(
  secret: string,
): string {
  const iv = randomBytes(12);
  const key = encryptionKey();

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        secret,
        "utf8",
      ),
      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  return [
    "aesgcm-v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join("$");
}

export function decryptTwoFactorSecret(
  encoded: string,
): string {
  const [
    version,
    ivValue,
    tagValue,
    encryptedValue,
  ] = encoded.split("$");

  if (
    version !== "aesgcm-v1" ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error(
      "Invalid encrypted 2FA secret.",
    );
  }

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(
        ivValue,
        "base64url",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      tagValue,
      "base64url",
    ),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(
        encryptedValue,
        "base64url",
      ),
    ),
    decipher.final(),
  ]).toString("utf8");
}

export function generateTotpSecret():
string {
  const bytes = randomBytes(20);

  let bits = "";
  for (const byte of bytes) {
    bits += byte
      .toString(2)
      .padStart(8, "0");
  }

  let result = "";

  for (
    let index = 0;
    index < bits.length;
    index += 5
  ) {
    const chunk =
      bits.slice(
        index,
        index + 5,
      ).padEnd(5, "0");

    result +=
      BASE32[
        Number.parseInt(
          chunk,
          2,
        )
      ];
  }

  return result;
}

function decodeBase32(
  value: string,
): Buffer {
  const normalized =
    value
      .toUpperCase()
      .replace(/[^A-Z2-7]/g, "");

  let bits = "";

  for (const character of normalized) {
    const index =
      BASE32.indexOf(character);

    if (index < 0) {
      throw new Error(
        "Invalid base32 secret.",
      );
    }

    bits += index
      .toString(2)
      .padStart(5, "0");
  }

  const output: number[] = [];

  for (
    let index = 0;
    index + 8 <= bits.length;
    index += 8
  ) {
    output.push(
      Number.parseInt(
        bits.slice(
          index,
          index + 8,
        ),
        2,
      ),
    );
  }

  return Buffer.from(output);
}

function totpForCounter(
  secret: string,
  counter: number,
): string {
  const buffer =
    Buffer.alloc(8);

  buffer.writeBigUInt64BE(
    BigInt(counter),
  );

  const digest =
    createHmac(
      "sha1",
      decodeBase32(secret),
    )
      .update(buffer)
      .digest();

  const offset =
    digest[
      digest.length - 1
    ]! & 0x0f;

  const binary =
    (
      (
        digest[offset]! &
        0x7f
      ) << 24
    ) |
    (
      digest[offset + 1]! <<
      16
    ) |
    (
      digest[offset + 2]! <<
      8
    ) |
    digest[offset + 3]!;

  return (
    binary %
    10 ** TOTP_DIGITS
  )
    .toString()
    .padStart(
      TOTP_DIGITS,
      "0",
    );
}

export function verifyTotp(
  secret: string,
  token: string,
): boolean {
  const normalized =
    token.replace(/\s+/g, "");

  if (
    !/^\d{6}$/.test(
      normalized,
    )
  ) {
    return false;
  }

  const counter =
    Math.floor(
      Date.now() /
        1000 /
        TOTP_PERIOD,
    );

  for (
    const delta of [-1, 0, 1]
  ) {
    const expected =
      totpForCounter(
        secret,
        counter + delta,
      );

    const left =
      Buffer.from(expected);

    const right =
      Buffer.from(normalized);

    if (
      left.length ===
        right.length &&
      timingSafeEqual(
        left,
        right,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function createOtpAuthUri({
  account,
  issuer = "Staark Inc",
  secret,
}: {
  account: string;
  issuer?: string;
  secret: string;
}): string {
  const label =
    `${issuer}:${account}`;

  const query =
    new URLSearchParams({
      secret,
      issuer,
      algorithm: "SHA1",
      digits:
        String(TOTP_DIGITS),
      period:
        String(TOTP_PERIOD),
    });

  return (
    `otpauth://totp/` +
    `${encodeURIComponent(label)}` +
    `?${query.toString()}`
  );
}

function normalizeRecoveryCode(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(
  value: string,
): string {
  return createHash("sha256")
    .update(
      normalizeRecoveryCode(
        value,
      ),
    )
    .digest("hex");
}

export function createRecoveryCodes(): {
  codes: string[];
  hashes: string[];
} {
  const codes =
    Array.from(
      { length: 8 },
      () => {
        const value =
          randomBytes(5)
            .toString("hex")
            .toUpperCase();

        return (
          value.slice(0, 5) +
          "-" +
          value.slice(5)
        );
      },
    );

  return {
    codes,
    hashes:
      codes.map(
        hashRecoveryCode,
      ),
  };
}
