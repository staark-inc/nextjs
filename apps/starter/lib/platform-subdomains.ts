export const RESERVED_PLATFORM_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "cdn",
  "assets",
  "static",
  "origin",
  "edge",

  "staark",
  "system",
  "internal",
  "next",

  "admin",
  "dashboard",
  "login",
  "auth",
  "oauth",
  "account",
  "accounts",
  "billing",

  "support",
  "help",
  "status",
  "health",
  "monitor",
  "monitoring",

  "demo",
  "dev",
  "test",
  "staging",
  "stage",
  "prod",
  "production",
  "preview",
  "beta",
  "alpha",

  "mail",
  "smtp",
  "imap",
  "pop",
  "pop3",

  "gateway",
  "proxy",
  "webhook",
  "webhooks",
  "metrics",
]);

const RESERVED_PLATFORM_PATTERNS = [
  /^www\d*$/,
  /^ns\d+$/,
  /^mx\d+$/,
];

export function isReservedPlatformSubdomain(
  value: string,
): boolean {
  const label = value.trim().toLowerCase();

  if (RESERVED_PLATFORM_SUBDOMAINS.has(label)) {
    return true;
  }

  return RESERVED_PLATFORM_PATTERNS.some(
    (pattern) => pattern.test(label),
  );
}
