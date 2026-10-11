/**
 * Runtime product discriminator, independent of websiteType ("salon",
 * "custom", etc.) and domainMode ("platform" | "custom").
 *
 * Legacy Hub senders omit this field; allow them during the staged rollout.
 * Never treat an explicit Custom Runtime request as a SaaS request.
 */
export function assertSaaSRuntimeKind(value: unknown): void {
  if (value !== undefined && value !== "saas") {
    throw new Error('Unsupported runtimeKind: SaaS Runtime only accepts "saas".');
  }
}
