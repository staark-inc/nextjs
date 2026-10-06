import type { CustomRuntimeConfig } from "./config.ts";

/** Server-only: credentials are resolved at invocation, never stored in manifests. */
export function createCustomApiIntegrations(
  config: CustomRuntimeConfig,
  env: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch,
) {
  const clients = new Map<string, { request(path: string, init?: RequestInit): Promise<Response> }>();
  for (const integration of config.integrations) {
    if (!integration.enabled) continue;
    if (clients.has(integration.key)) throw new Error(`Duplicate API integration "${integration.key}".`);
    const base = new URL(integration.baseUrl);
    if (base.username || base.password || base.search || base.hash) throw new Error("API base URLs cannot contain credentials, query or fragment.");
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    clients.set(integration.key, {
      async request(relativePath, init = {}) {
        const url = new URL(relativePath, base);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.username || url.password) {
          throw new Error("API request must stay within its configured base URL.");
        }
        const headers = new Headers(init.headers);
        if (integration.tokenEnv) {
          const token = env[integration.tokenEnv];
          if (!token) throw new Error(`Missing credential for API integration "${integration.key}".`);
          headers.set("Authorization", `Bearer ${token}`);
        }
        const signal = AbortSignal.timeout(integration.timeoutMs);
        const response = await request(url, {
          ...init, headers, redirect: "error",
          signal: init.signal ? AbortSignal.any([init.signal, signal]) : signal,
        });
        if (!response.ok) throw new Error(`API integration "${integration.key}" returned HTTP ${response.status}.`);
        return response;
      },
    });
  }
  return clients;
}
