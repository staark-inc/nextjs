export type TenantRequestInput = {
  host?: string | null;
  forwardedHost?: string | null;
};

export function normalizeHostname(value: string | null | undefined): string {
  const raw = value?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!raw) return "";

  const withoutPort = raw.replace(/:\d+$/, "");
  return withoutPort.endsWith(".") ? withoutPort.slice(0, -1) : withoutPort;
}

export function resolveRequestHostname(
  input: TenantRequestInput,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const trustProxy = env.STAARK_TRUST_PROXY === "1";
  return normalizeHostname(
    trustProxy && input.forwardedHost ? input.forwardedHost : input.host,
  );
}
