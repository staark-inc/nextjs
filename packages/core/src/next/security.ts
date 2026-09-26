/**
 * Security headers for next.config `headers()` — the Next.js side of the Hub
 * Security module's hardening defaults.
 *
 *   headers: async () => [{ source: "/:path*", headers: staarkSecurityHeaders() }]
 */
export function staarkSecurityHeaders(opts: { hsts?: boolean; frameAncestors?: string; upgradeInsecure?: boolean } = {}): { key: string; value: string }[] {
  // HTTPS-only hardening (HSTS + CSP upgrade-insecure-requests) is on in production
  // and off in dev, so the http dev server works over a LAN IP, not just localhost.
  const secure = process.env.NODE_ENV === "production";

  const csp = [
    `frame-ancestors ${opts.frameAncestors ?? "'self'"}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (opts.upgradeInsecure ?? secure) csp.push("upgrade-insecure-requests");

  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Content-Security-Policy", value: csp.join("; ") },
  ];
  if (opts.hsts ?? secure) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  }
  return headers;
}
