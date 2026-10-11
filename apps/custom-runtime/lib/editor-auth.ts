import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export type AdminConfig = { username: string; passwordHash: string; secret: string; allowHttp: boolean };
export type AdminSession = { project: string; user: string; expires: number; csrf: string; credential: string };
export function adminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig | null {
  if (env.CUSTOM_ADMIN_ENABLED !== "true") return null;
  const username = env.CUSTOM_ADMIN_USERNAME?.trim();
  const passwordHash = env.CUSTOM_ADMIN_PASSWORD_HASH?.trim();
  const secret = env.CUSTOM_ADMIN_SESSION_SECRET;
  if (!username || username.length > 100 || !passwordHash || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash) || !secret || secret.length < 32) return null;
  return { username, passwordHash, secret, allowHttp: env.CUSTOM_ADMIN_ALLOW_HTTP === "true" };
}
export async function hashAdminPassword(password: string) {
  if (password.length < 12 || Buffer.byteLength(password) > 1024) throw new Error("Use a password of at least 12 characters (maximum 1024 bytes).");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await derive(password, salt, 64) as Buffer).toString("hex")}`;
}
export async function verifyAdminPassword(config: AdminConfig, username: string, password: string) {
  if (Buffer.byteLength(password) > 1024) return false;
  const [salt, expected] = config.passwordHash.split(":");
  const actual = await derive(password, salt!, 64) as Buffer;
  const userMatches = createHash("sha256").update(username).digest().equals(createHash("sha256").update(config.username).digest());
  return timingSafeEqual(actual, Buffer.from(expected!, "hex")) && userMatches;
}
function signature(value: string, config: AdminConfig) { return createHmac("sha256", config.secret).update(value).digest("base64url"); }
function credential(config: AdminConfig) { return createHash("sha256").update(config.passwordHash).digest("hex"); }
export function adminCookieName(project: string) { return `staark_admin_${createHash("sha256").update(project).digest("hex").slice(0, 16)}`; }
export function createAdminSession(config: AdminConfig, project: string, now = Date.now()) {
  const session: AdminSession = { project, user: config.username, expires: now + ADMIN_SESSION_SECONDS * 1000, csrf: randomBytes(32).toString("hex"), credential: credential(config) };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { token: `${payload}.${signature(payload, config)}`, session };
}
export function readAdminSession(token: string | undefined, config: AdminConfig, project: string, now = Date.now()): AdminSession | null {
  if (!token || token.length > 2048) return null;
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra) return null;
  const expected = signature(payload, config);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    if (session.project !== project || session.user !== config.username || session.credential !== credential(config) || typeof session.expires !== "number" || session.expires <= now || session.expires > now + ADMIN_SESSION_SECONDS * 1000 || !/^[a-f0-9]{64}$/.test(session.csrf)) return null;
    return session;
  } catch { return null; }
}
