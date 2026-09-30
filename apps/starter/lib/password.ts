import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must contain 12-128 characters.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt);
  return `scrypt-v1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [version, saltValue, keyValue] = encoded.split("$");
  if (version !== "scrypt-v1" || !saltValue || !keyValue) return false;

  try {
    const expected = Buffer.from(keyValue, "base64url");
    const actual = await derive(
      password,
      Buffer.from(saltValue, "base64url"),
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
