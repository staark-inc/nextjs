import type { AdminFeature } from "./admin-features";
import { canUsePlanFeature } from "./feature-access";
import type { TenantEntitlements } from "./tenant-context";

export class PlanLimitError extends Error {
  readonly key: string;
  readonly limit: number;
  readonly current: number;

  constructor(key: string, limit: number, current: number) {
    super(`Plan limit reached for ${key}: ${current}/${limit}.`);
    this.name = "PlanLimitError";
    this.key = key;
    this.limit = limit;
    this.current = current;
  }
}

export function entitlementNumber(
  entitlements: TenantEntitlements,
  key: string,
): number | null {
  const value = entitlements[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function entitlementBoolean(
  entitlements: TenantEntitlements,
  key: string,
): boolean {
  return entitlements[key] === true;
}

export function adminFeaturesFromPlanEntitlements(
  entitlements: TenantEntitlements,
): AdminFeature[] {
  const features: AdminFeature[] = [];

  if (canUsePlanFeature(entitlements, "leads")) {
    features.push("inbox");
  }

  if (canUsePlanFeature(entitlements, "booking")) {
    features.push("booking");
  }

  if (canUsePlanFeature(entitlements, "seo")) {
    features.push("seo");
  }

  if (canUsePlanFeature(entitlements, "analytics")) {
    features.push("analytics");
  }

  if (canUsePlanFeature(entitlements, "customDomain")) {
    features.push("domains");
  }

  return features;
}

export function assertWithinPlanLimit(
  entitlements: TenantEntitlements,
  key: string,
  current: number,
): void {
  const limit = entitlementNumber(entitlements, key);
  if (limit === null) return;

  if (current >= limit) {
    throw new PlanLimitError(key, limit, current);
  }
}
